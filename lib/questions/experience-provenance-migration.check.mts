import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Reads the migration SQL and applies its privileges, policies, keys, and
// referential actions to an in-memory schema. No database is contacted.

const migrationNames = [
  '20261026000000_initial_v2_schema.sql',
  '20261028173000_curiosities.sql',
  '20261028210000_ai_request_reservations.sql',
  '20261030200000_question_branches.sql',
  '20261102120000_curiosity_cover_images.sql',
  '20261113200000_experiences.sql',
  '20261113220000_experience_north_star_and_circles.sql',
  '20261124190000_concept_experience_sources.sql',
  '20261126200000_concept_origin_question.sql',
]

const sqlFiles = new Map(migrationNames.map((name) => [
  name,
  readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'),
]))
const provenanceFile = '20261124190000_concept_experience_sources.sql'
const provenanceSql = sqlFiles.get(provenanceFile) ?? ''

type Row = Record<string, string | null>
type Column = { name: string; notNull: boolean; hasDefault: boolean; defaultValue: string | null }
type OnDelete = { kind: 'cascade' | 'restrict' | 'no action' } | { kind: 'set null'; columns: string[] | null }
type ForeignKey = {
  name: string
  table: string
  columns: string[]
  referencedTable: string
  referencedColumns: string[]
  onDelete: OnDelete
}
type UniqueKey = { name: string; table: string; columns: string[] }
type Check = { name: string; table: string; expression: string }
type Policy = {
  name: string
  table: string
  restrictive: boolean
  command: string
  role: string
  using: string | null
  check: string | null
}
type Trigger = { name: string; table: string; timing: string; event: string; level: string; function: string }
type Database = { rows: Record<string, Row[]> }

const columns = new Map<string, Column[]>()
const foreignKeys: ForeignKey[] = []
const uniqueKeys: UniqueKey[] = []
const checks: Check[] = []
const policies: Policy[] = []
const triggers: Trigger[] = []
type SqlFunction = { body: string; security: 'definer' | 'invoker'; searchPath: string; args: string }
const functions = new Map<string, SqlFunction>()
const functionExec = new Map<string, Set<string>>()
const grants = new Map<string, Map<string, Set<string>>>()
const rls = new Set<string>()

function relation(name: string) {
  return name.startsWith('public.') ? name.slice('public.'.length) : name
}

function sameColumns(left: string[], right: string[]) {
  return left.length === right.length && left.every((column, index) => column === right[index])
}

function takeParen(text: string, open: number) {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    const char = text[index]
    if (char === "'") {
      index += 1
      while (index < text.length) {
        if (text[index] === "'" && text[index + 1] === "'") {
          index += 2
          continue
        }
        if (text[index] === "'") break
        index += 1
      }
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) return text.slice(open + 1, index)
    }
  }
  throw new Error(`Unbalanced parentheses: ${text.slice(open, open + 80)}`)
}

function splitComma(text: string) {
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === "'") {
      current += char
      index += 1
      while (index < text.length) {
        current += text[index]
        if (text[index] === "'" && text[index + 1] === "'") {
          current += text[index + 1]
          index += 2
          continue
        }
        if (text[index] === "'") break
        index += 1
      }
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function statementsOf(sql: string) {
  const source = sql.split('\n').map((line) => {
    const mark = line.indexOf('--')
    return mark === -1 ? line : line.slice(0, mark)
  }).join('\n')
  const statements: string[] = []
  let current = ''
  let depth = 0
  for (let index = 0; index < source.length; index += 1) {
    if (source.startsWith('$$', index)) {
      const end = source.indexOf('$$', index + 2)
      if (end < 0) throw new Error('Unclosed dollar quote')
      current += source.slice(index, end + 2)
      index = end + 1
      continue
    }
    const char = source[index]
    if (char === "'") {
      current += char
      index += 1
      while (index < source.length) {
        current += source[index]
        if (source[index] === "'" && source[index + 1] === "'") {
          current += source[index + 1]
          index += 2
          continue
        }
        if (source[index] === "'") break
        index += 1
      }
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ';' && depth === 0) {
      if (current.trim()) statements.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}

function tableColumns(table: string) {
  const found = columns.get(table)
  if (found) return found
  const created: Column[] = []
  columns.set(table, created)
  return created
}

function addUnique(table: string, name: string, keyColumns: string[]) {
  if (uniqueKeys.some((key) => key.name === name)) throw new Error(`Duplicate constraint ${name}`)
  uniqueKeys.push({ name, table, columns: keyColumns })
}

function addForeignKey(key: ForeignKey) {
  if (foreignKeys.some((item) => item.name === key.name)) throw new Error(`Duplicate constraint ${key.name}`)
  foreignKeys.push(key)
}

function parseOnDelete(tail: string): OnDelete {
  const text = tail.replace(/\s+/g, ' ').trim().toLowerCase()
  if (text === '' || text.startsWith('deferrable')) return { kind: 'no action' }
  if (text.startsWith('on delete cascade')) return { kind: 'cascade' }
  if (text.startsWith('on delete restrict')) return { kind: 'restrict' }
  if (text.startsWith('on delete no action')) return { kind: 'no action' }
  const setNull = text.match(/^on delete set null(?: \(([^)]+)\))?/)
  if (setNull) return { kind: 'set null', columns: setNull[1] ? splitComma(setNull[1]) : null }
  throw new Error(`Unknown delete action: ${text}`)
}

function parseColumn(table: string, text: string) {
  const match = text.match(/^(\w+)\s+([\s\S]+)$/)
  if (!match) throw new Error(`Column: ${text}`)
  const name = match[1]
  const rest = match[2]
  const referenceAt = rest.search(/\breferences\b/i)
  const definition = referenceAt === -1 ? rest : rest.slice(0, referenceAt)
  const generated = /\bgenerated\b/i.test(definition)
  const defaultMatch = definition.match(/\bdefault\s+((?:pg_catalog\.)?now\(\)|'[^']*'|-?\d+)/i)
  const defaultValue = defaultMatch
    ? (defaultMatch[1].startsWith("'")
      ? defaultMatch[1].slice(1, -1)
      : defaultMatch[1].toLowerCase().includes('now(') ? '2026-11-24T00:00:00.000Z' : defaultMatch[1])
    : generated ? 'identity' : null
  tableColumns(table).push({
    name,
    notNull: /\bnot null\b/i.test(definition) || /\bprimary key\b/i.test(definition),
    hasDefault: generated || Boolean(defaultMatch),
    defaultValue,
  })
  if (/\bprimary key\b/i.test(definition)) addUnique(table, `${table}_pkey`, [name])
  if (referenceAt === -1) return
  const reference = rest.slice(referenceAt)
  const target = reference.match(/^references\s+((?:public|auth)\.\w+)\s*\(/i)
  if (!target) throw new Error(reference)
  const open = reference.indexOf('(')
  const referencedColumns = splitComma(takeParen(reference, open))
  const tail = reference.slice(open + takeParen(reference, open).length + 2)
  addForeignKey({
    name: `${table}_${name}_fkey`,
    table,
    columns: [name],
    referencedTable: relation(target[1]),
    referencedColumns,
    onDelete: parseOnDelete(tail),
  })
}

function parseConstraint(table: string, text: string) {
  const named = text.match(/^constraint\s+(\w+)\s+([\s\S]+)$/i)
  if (!named) throw new Error(text)
  const name = named[1]
  const body = named[2].trim()
  if (/^unique\b/i.test(body)) {
    addUnique(table, name, splitComma(takeParen(body, body.indexOf('('))))
    return
  }
  if (/^primary key\b/i.test(body)) {
    const keyColumns = splitComma(takeParen(body, body.indexOf('(')))
    addUnique(table, name, keyColumns)
    return
  }
  if (/^foreign key\b/i.test(body)) {
    const open = body.indexOf('(')
    const keyColumns = splitComma(takeParen(body, open))
    const after = body.slice(open + takeParen(body, open).length + 2).trim()
    const target = after.match(/^references\s+((?:public|auth)\.\w+)\s*\(/i)
    if (!target) throw new Error(after)
    const referencedOpen = after.indexOf('(')
    const referencedColumns = splitComma(takeParen(after, referencedOpen))
    const tail = after.slice(referencedOpen + takeParen(after, referencedOpen).length + 2)
    addForeignKey({
      name,
      table,
      columns: keyColumns,
      referencedTable: relation(target[1]),
      referencedColumns,
      onDelete: parseOnDelete(tail),
    })
    return
  }
  if (/^check\b/i.test(body)) {
    checks.push({ name, table, expression: takeParen(body, body.indexOf('(')) })
    return
  }
  throw new Error(`Unknown constraint ${name}`)
}

function parseElement(table: string, element: string) {
  if (/^constraint\b/i.test(element)) {
    parseConstraint(table, element)
    return
  }
  if (/^primary key\b/i.test(element)) {
    const keyColumns = splitComma(takeParen(element, element.indexOf('(')))
    addUnique(table, `${table}_pkey`, keyColumns)
    for (const column of keyColumns) {
      const found = tableColumns(table).find((item) => item.name === column)
      if (found) found.notNull = true
    }
    return
  }
  parseColumn(table, element)
}

function parseCreateTable(statement: string) {
  const match = statement.match(/^create table\s+((?:public|storage)\.\w+)\s*\(/i)
  if (!match) throw new Error(statement.slice(0, 120))
  const table = relation(match[1])
  tableColumns(table)
  const open = statement.indexOf('(')
  for (const element of splitComma(takeParen(statement, open))) parseElement(table, element)
}

function parseAlter(statement: string) {
  const flat = statement.replace(/\s+/g, ' ').trim()
  const match = flat.match(/^alter table\s+((?:public|storage)\.\w+)\s+(.+)$/i)
  if (!match) throw new Error(flat.slice(0, 140))
  const table = relation(match[1])
  const action = match[2]
  if (/^enable row level security$/i.test(action)) {
    rls.add(table)
    return
  }
  if (/^add column\s+/i.test(action)) {
    parseColumn(table, action.replace(/^add column\s+/i, ''))
    return
  }
  const notNull = action.match(/^alter column\s+(\w+)\s+set not null$/i)
  if (notNull) {
    const column = tableColumns(table).find((item) => item.name === notNull[1])
    if (!column) throw new Error(`Missing column ${table}.${notNull[1]}`)
    column.notNull = true
    return
  }
  if (/^add constraint\s+/i.test(action)) {
    parseConstraint(table, action.replace(/^add\s+/i, ''))
    return
  }
  throw new Error(`Unknown alter: ${flat.slice(0, 160)}`)
}

function parsePolicy(statement: string) {
  const flat = statement.replace(/\s+/g, ' ').trim()
  const match = flat.match(/^create policy\s+(\w+)\s+on\s+((?:public|storage)\.\w+)\s+(.*)$/i)
  if (!match) throw new Error(flat.slice(0, 140))
  let rest = match[3]
  let restrictive = false
  if (/^as restrictive\b/i.test(rest)) {
    restrictive = true
    rest = rest.replace(/^as restrictive\s+/i, '')
  }
  const command = rest.match(/^for\s+(select|insert|update|delete|all)\s+to\s+(\w+)\s*(.*)$/i)
  if (!command) throw new Error(rest.slice(0, 120))
  const clauses = command[3]
  let using: string | null = null
  let check: string | null = null
  let index = 0
  while (index < clauses.length) {
    while (clauses[index] === ' ') index += 1
    if (index >= clauses.length) break
    const usingAt = clauses.slice(index).match(/^using\s*\(/i)
    const checkAt = clauses.slice(index).match(/^with check\s*\(/i)
    if (usingAt) {
      const open = index + usingAt[0].length - 1
      using = takeParen(clauses, open)
      index = open + using.length + 2
      continue
    }
    if (checkAt) {
      const open = index + checkAt[0].length - 1
      check = takeParen(clauses, open)
      index = open + check.length + 2
      continue
    }
    throw new Error(`Policy clause: ${clauses.slice(index, index + 80)}`)
  }
  policies.push({
    name: match[1],
    table: relation(match[2]),
    restrictive,
    command: command[1].toLowerCase(),
    role: command[2].toLowerCase(),
    using,
    check,
  })
}

function grantMap(table: string) {
  const found = grants.get(table)
  if (found) return found
  const created = new Map<string, Set<string>>()
  grants.set(table, created)
  return created
}

function parseGrant(statement: string) {
  const flat = statement.replace(/\s+/g, ' ').trim()
  const match = flat.match(/^grant\s+(.+)\s+on table\s+(.+)\s+to\s+(\w+)$/i)
  if (!match) throw new Error(flat.slice(0, 140))
  const privileges = match[1].split(',').map((item) => item.trim().toLowerCase())
  const role = match[3].toLowerCase()
  for (const tableName of match[2].split(',').map((item) => relation(item.trim()))) {
    const roleGrants = grantMap(tableName).get(role) ?? new Set<string>()
    for (const privilege of privileges) roleGrants.add(privilege)
    grantMap(tableName).set(role, roleGrants)
  }
}

function parseRevoke(statement: string) {
  const flat = statement.replace(/\s+/g, ' ').trim()
  const match = flat.match(/^revoke all on table\s+(.+)\s+from\s+(.+)$/i)
  if (!match) throw new Error(flat.slice(0, 140))
  const roles = match[2].split(',').map((item) => item.trim().toLowerCase())
  for (const tableName of match[1].split(',').map((item) => relation(item.trim()))) {
    for (const role of roles) grantMap(tableName).set(role, new Set())
  }
}

function parseTrigger(statement: string) {
  const flat = statement.replace(/\s+/g, ' ').trim()
  const match = flat.match(/^create trigger\s+(\w+)\s+(before|after)\s+(.+?)\s+on\s+((?:public|storage)\.\w+)\s+for each\s+(row|statement)\s+execute\s+(?:function|procedure)\s+(?:public\.)?(\w+)\(\)$/i)
  if (!match) throw new Error(flat.slice(0, 160))
  triggers.push({
    name: match[1],
    timing: match[2].toLowerCase(),
    event: match[3].toLowerCase(),
    table: relation(match[4]),
    level: match[5].toLowerCase(),
    function: match[6].toLowerCase(),
  })
}

function parseFunction(statement: string) {
  const match = statement.match(/^create or replace function\s+(?:public\.)?(\w+)\s*\(([^)]*)\)/i)
  if (!match) throw new Error(statement.slice(0, 120))
  const start = statement.indexOf('$$')
  const end = statement.indexOf('$$', start + 2)
  const path = statement.match(/set search_path = ([^\n]+)/i)
  functions.set(match[1].toLowerCase(), {
    body: start < 0 || end < 0 ? '' : statement.slice(start + 2, end),
    security: /security definer/i.test(statement) ? 'definer' : 'invoker',
    searchPath: path ? path[1].replace(/\$\$[\s\S]*$/, '').trim().replace(/;$/, '') : '',
    args: match[2].replace(/\s+/g, ' ').trim().toLowerCase(),
  })
}

function parseExecute(statement: string) {
  const flat = statement.replace(/\s+/g, ' ').trim()
  const match = flat.match(/^grant execute on function (?:public\.)?(\w+)\(([^)]*)\) to (\w+)$/i)
  if (!match) return
  const roles = functionExec.get(match[1].toLowerCase()) ?? new Set<string>()
  roles.add(match[3].toLowerCase())
  functionExec.set(match[1].toLowerCase(), roles)
}

function classify(statement: string, strict: boolean) {
  const flat = statement.replace(/\s+/g, ' ').trim().toLowerCase()
  if (flat.startsWith('create table ')) return parseCreateTable(statement)
  if (flat.startsWith('alter table ')) return parseAlter(statement)
  if (flat.startsWith('create policy ')) return parsePolicy(statement)
  if (flat.startsWith('grant execute ')) return parseExecute(statement)
  if (flat.startsWith('revoke all on function ') || flat.startsWith('revoke all on sequence ')) return
  if (flat.startsWith('grant ')) return parseGrant(statement)
  if (flat.startsWith('revoke all on table ')) return parseRevoke(statement)
  if (flat.startsWith('create trigger ')) return parseTrigger(statement)
  if (flat.startsWith('create or replace function ')) return parseFunction(statement)
  if (flat.startsWith('create index ') || flat.startsWith('create unique index ') || flat.startsWith('comment on ') || flat.startsWith('insert into ') || flat.startsWith('update ')) return
  if (strict) throw new Error(`Unclassified migration statement: ${flat.slice(0, 160)}`)
}

function hasUnique(table: string, keyColumns: string[]) {
  return uniqueKeys.some((key) => key.table === table && sameColumns(key.columns, keyColumns))
}

const beforeProvenance = migrationNames.filter((name) => name !== provenanceFile)
for (const name of beforeProvenance) {
  for (const statement of statementsOf(sqlFiles.get(name) ?? '')) classify(statement, false)
}
assert.equal(hasUnique('experiences', ['id', 'user_id', 'curiosity_id']), false)
assert.equal(hasUnique('experience_circle_items', ['id', 'user_id', 'experience_id']), false)
assert.equal(uniqueKeys.some((key) => key.name === 'experiences_owner_curiosity_key'), false)
assert.equal(uniqueKeys.some((key) => key.name === 'experience_circle_items_owner_experience_key'), false)
assert.equal(hasUnique('experiences', ['id', 'user_id']), true)
assert.equal(hasUnique('experience_circle_items', ['id', 'user_id']), true)
assert.equal(hasUnique('concepts', ['id', 'user_id', 'curiosity_id']), true)
assert.equal(hasUnique('concepts', ['origin_question_id']), true)
assert.equal(hasUnique('curiosities', ['id', 'user_id']), true)
assert.equal(functions.has('prevent_user_id_change'), true)
assert.equal(functions.has('prevent_curiosity_id_change'), true)

for (const statement of statementsOf(provenanceSql)) classify(statement, true)

const initialSql = sqlFiles.get('20261026000000_initial_v2_schema.sql') ?? ''
assert.equal(initialSql.includes('Minimum server version: PostgreSQL 15'), true)
assert.equal(initialSql.includes('on delete set null (question_id)'), true)
assert.equal(provenanceSql.includes('dacfaoksxfqztnswmnfm'), true)
assert.equal(provenanceSql.includes('to service_role'), false)
assert.equal(provenanceSql.includes('create or replace function public.prevent_user_id_change'), false)
assert.equal(provenanceSql.includes('create or replace function public.prevent_curiosity_id_change'), false)

const provenanceKeys = foreignKeys.filter((key) => key.table === 'concept_experience_sources')
function keyNamed(name: string) {
  const key = provenanceKeys.find((item) => item.name === name)
  assert.ok(key, name)
  return key
}
const conceptKey = keyNamed('concept_experience_sources_concept_owner')
const curiosityKey = keyNamed('concept_experience_sources_curiosity_owner')
const experienceKey = keyNamed('concept_experience_sources_experience_owner')
const itemKey = keyNamed('concept_experience_sources_item_owner')
const userKey = provenanceKeys.find((key) => key.referencedTable === 'auth.users')
assert.ok(userKey)
assert.deepEqual(conceptKey.columns, ['concept_id', 'user_id', 'curiosity_id'])
assert.deepEqual(conceptKey.referencedColumns, ['id', 'user_id', 'curiosity_id'])
assert.equal(conceptKey.onDelete.kind, 'cascade')
assert.deepEqual(curiosityKey.columns, ['curiosity_id', 'user_id'])
assert.deepEqual(curiosityKey.referencedColumns, ['id', 'user_id'])
assert.equal(curiosityKey.onDelete.kind, 'no action')
assert.deepEqual(experienceKey.columns, ['experience_id', 'user_id', 'curiosity_id'])
assert.deepEqual(experienceKey.referencedColumns, ['id', 'user_id', 'curiosity_id'])
assert.deepEqual(experienceKey.onDelete, { kind: 'set null', columns: ['experience_id'] })
assert.deepEqual(itemKey.columns, ['item_id', 'user_id', 'experience_id'])
assert.deepEqual(itemKey.referencedColumns, ['id', 'user_id', 'experience_id'])
assert.deepEqual(itemKey.onDelete, { kind: 'set null', columns: ['item_id'] })
assert.equal(userKey.onDelete.kind, 'cascade')
const originQuestionKey = foreignKeys.find((key) => key.name === 'concepts_origin_question')
assert.ok(originQuestionKey)
assert.equal(originQuestionKey?.table, 'concepts')
assert.deepEqual(originQuestionKey?.columns, ['origin_question_id', 'user_id', 'curiosity_id'])
assert.equal(originQuestionKey?.referencedTable, 'questions')
assert.deepEqual(originQuestionKey?.referencedColumns, ['id', 'user_id', 'curiosity_id'])
assert.deepEqual(originQuestionKey?.onDelete, { kind: 'set null', columns: ['origin_question_id'] })
for (const key of [conceptKey, curiosityKey, experienceKey, itemKey]) {
  assert.equal(hasUnique(key.referencedTable, key.referencedColumns), true, key.name)
}
const itemsExperience = foreignKeys.find((key) => key.name === 'experience_circle_items_experience_owner')
const experiencesCuriosity = foreignKeys.find((key) => key.name === 'experiences_curiosity_owner')
const conceptsCuriosity = foreignKeys.find((key) => key.name === 'concepts_curiosity_owner')
assert.ok(itemsExperience && experiencesCuriosity && conceptsCuriosity)
assert.deepEqual(itemsExperience.columns, ['experience_id', 'user_id'])
assert.equal(itemsExperience.onDelete.kind, 'cascade')
assert.equal(experiencesCuriosity.onDelete.kind, 'cascade')
assert.equal(conceptsCuriosity.onDelete.kind, 'cascade')

const provenanceChecks = checks.filter((check) => check.table === 'concept_experience_sources')
assert.equal(provenanceChecks.length, 2)
for (const check of provenanceChecks) {
  assert.equal(/\b(?:experience_id|item_id)\b/i.test(check.expression), false, check.name)
}
const provenanceColumns = tableColumns('concept_experience_sources')
assert.equal(provenanceColumns.find((column) => column.name === 'experience_id')?.notNull, false)
assert.equal(provenanceColumns.find((column) => column.name === 'item_id')?.notNull, false)
assert.equal(provenanceColumns.find((column) => column.name === 'circle')?.notNull, true)
assert.equal(provenanceColumns.find((column) => column.name === 'original_text_snapshot')?.notNull, true)

const provenanceGrants = grants.get('concept_experience_sources')
assert.deepEqual([...(provenanceGrants?.get('authenticated') ?? [])].sort(), ['select'])
const sourceGrants = grants.get('experience_visualisation_sources')
assert.deepEqual([...(sourceGrants?.get('authenticated') ?? [])].sort(), ['delete', 'insert', 'select'])
for (const role of ['public', 'anon', 'service_role']) {
  assert.equal(provenanceGrants?.get(role)?.size ?? 0, 0, role)
}
assert.equal(rls.has('concept_experience_sources'), true)
function permissive(command: string) {
  return policies.filter((policy) => (
    policy.table === 'concept_experience_sources'
    && !policy.restrictive
    && policy.role === 'authenticated'
    && (policy.command === command || policy.command === 'all')
  ))
}
assert.equal(permissive('select').length, 1)
assert.equal(permissive('insert').length, 0)
assert.equal(permissive('update').length, 0)
assert.equal(permissive('delete').length, 0)
assert.equal(policies.some((policy) => policy.name === 'concept_experience_sources_delete'), false)
assert.equal(policies.some((policy) => policy.table === 'concept_experience_sources' && policy.command === 'update'), false)
assert.equal(policies.some((policy) => policy.table === 'experience_visualisation_sources' && policy.command === 'update'), false)
const membership = policies.find((policy) => policy.name === 'concept_experience_sources_curiosity_membership')
const liveSource = policies.find((policy) => policy.name === 'experience_visualisation_sources_live_topic')
assert.ok(membership && liveSource)
assert.equal(membership.restrictive, true)
assert.equal(membership.command, 'all')
assert.equal(liveSource.restrictive, true)
assert.equal(liveSource.command, 'insert')
const saveFunction = functions.get('save_experience_visualisation_provenance')
const captureFunction = functions.get('capture_experience_visualisation_source')
const preserveFunction = functions.get('preserve_experience_visualisation_source')
assert.ok(saveFunction && captureFunction && preserveFunction)
assert.equal(saveFunction.security, 'definer')
assert.equal(saveFunction.searchPath, "''")
assert.equal(saveFunction.args, 'p_concept_id uuid, p_source_id uuid, p_title text, p_considered_text text, p_image_path text, p_image_model text, p_prompt_version text')
assert.equal(captureFunction.security, 'invoker')
assert.equal(captureFunction.searchPath, 'public')
assert.equal(preserveFunction.security, 'invoker')
const saveBody = saveFunction.body.replace(/\s+/g, ' ').toLowerCase()
assert.equal(saveBody.includes('auth.uid()'), true)
assert.equal(saveBody.includes('captured.user_id = actor'), true)
assert.equal(saveBody.includes('concept_user <> actor'), true)
assert.equal(saveBody.includes('concept_curiosity is distinct from source.curiosity_id'), true)
assert.equal(saveBody.includes('insert into public.concepts'), true)
assert.equal(saveBody.includes('that visualisation has already been saved'), true)
assert.equal(saveBody.includes('pg_catalog.make_interval(days => 7)'), true)
assert.equal(saveBody.includes('for update'), true)
const originAt: number[] = []
for (let from = 0; from < saveBody.length;) {
  const found = saveBody.indexOf('saved.origin_source_id = p_source_id', from)
  if (found < 0) break
  originAt.push(found)
  from = found + 1
}
const peekSource = saveBody.indexOf('from public.experience_visualisation_sources')
const lockedSource = saveBody.indexOf('from public.experience_visualisation_sources', peekSource + 1)
const userLock = saveBody.indexOf('from auth.users')
const curiosityLock = saveBody.indexOf('from public.curiosities')
const experienceLock = saveBody.indexOf('from public.experiences')
const topicLock = saveBody.indexOf('from public.experience_circle_items')
const conceptInsert = saveBody.indexOf('insert into public.concepts')
const unavailable = saveBody.indexOf('that visualisation source is not available', lockedSource)
assert.equal(originAt.length >= 4, true)
assert.ok(originAt[0] < peekSource)
assert.ok(peekSource < userLock)
assert.ok(userLock < curiosityLock)
assert.ok(curiosityLock < experienceLock)
assert.ok(experienceLock < topicLock)
assert.ok(topicLock < lockedSource)
assert.ok(saveBody.slice(userLock, lockedSource).includes('for key share'))
const peekEnd = saveBody.indexOf('if not found', peekSource)
assert.equal(saveBody.slice(peekSource, peekEnd).includes('for update'), false)
assert.ok(originAt[2] > lockedSource && originAt[2] < unavailable)
assert.ok(originAt[3] > unavailable && originAt[3] < conceptInsert)
assert.equal(saveBody.slice(conceptInsert).includes('seen_experience'), false)
assert.equal(saveBody.slice(conceptInsert).includes('source.experience_id'), true)
assert.ok(provenanceSql.indexOf('create table public.concept_experience_sources') < provenanceSql.indexOf('create or replace function public.save_experience_visualisation_provenance'))
assert.equal(provenanceSql.includes('check_function_bodies'), false)
const knownTables = new Set(['concepts', 'curiosities', 'experiences', 'experience_circle_items', 'questions', 'concept_questions', 'users'])
for (const statement of statementsOf(provenanceSql)) {
  const created = statement.match(/^create table\s+(?:public\.)?(\w+)/i)
  for (const used of statement.matchAll(/(\w+)%rowtype/gi)) {
    if (!knownTables.has(used[1].toLowerCase())) throw new Error(`${used[1]} row type is used before its table`)
  }
  if (created) knownTables.add(created[1].toLowerCase())
}
const clearFunction = functions.get('clear_experience_visualisation_links')
assert.ok(clearFunction)
assert.equal(clearFunction.security, 'definer')
assert.equal(clearFunction.searchPath, "''")
assert.equal(functionExec.get('clear_experience_visualisation_links')?.has('authenticated') ?? false, false)
assert.equal(functionExec.get('clear_experience_visualisation_links')?.has('service_role') ?? false, false)
assert.ok(uniqueKeys.some((key) => key.table === 'concept_experience_sources' && key.name === 'concept_experience_sources_one_origin' && key.columns.join(',') === 'origin_source_id'))
const purgeFunction = functions.get('purge_abandoned_experience_visualisation_sources')
assert.ok(purgeFunction)
assert.equal(purgeFunction.security, 'definer')
assert.equal(purgeFunction.searchPath, "''")
assert.equal(purgeFunction.body.replace(/\s+/g, ' ').toLowerCase().includes('pg_catalog.make_interval(days => 7)'), true)
for (const [name, body] of [
  ['save_experience_visualisation_provenance', saveFunction.body],
  ['clear_experience_visualisation_links', clearFunction.body],
  ['purge_abandoned_experience_visualisation_sources', purgeFunction.body],
] as const) {
  const flat = body.replace(/\s+/g, ' ').toLowerCase().replace(/\bfor update\b/g, '').replace(/\bis distinct from\b/g, '')
  assert.equal(/\b(?:from|update|join|delete from|insert into)\s+(?!public\.|auth\.)[a-z_]/.test(flat), false, name)
}
assert.equal(functionExec.get('purge_abandoned_experience_visualisation_sources')?.has('authenticated'), true)
assert.equal(saveBody.includes('source.original_text_snapshot'), true)
assert.equal(saveBody.includes('source.circle'), true)
assert.equal(saveBody.includes('source.experience_id'), true)
assert.equal(saveBody.includes('source.item_id'), true)
assert.equal(functionExec.get('save_experience_visualisation_provenance')?.has('authenticated'), true)
assert.equal(functionExec.get('save_experience_visualisation_provenance')?.has('service_role') ?? false, false)
assert.equal(functionExec.get('save_experience_visualisation_provenance')?.has('anon') ?? false, false)
assert.deepEqual(
  triggers.filter((trigger) => trigger.table === 'concept_experience_sources').map((trigger) => [trigger.event, trigger.function]),
  [['update', 'prevent_user_id_change'], ['update', 'prevent_curiosity_id_change'], ['update', 'preserve_concept_experience_source']],
)
for (const statement of statementsOf(provenanceSql)) {
  const flat = statement.replace(/\s+/g, ' ').toLowerCase()
  const gardenWrite = /\b(?:alter table|create table|drop table|insert into|delete from|update)\s+public\.(?:concept_questions|questions)\b/.test(flat)
    || /\b(?:alter table|drop table|delete from|update)\s+public\.concepts\b/.test(flat)
    || /\b(?:alter table|create table|drop table|insert into|delete from|update)\s+storage\.objects\b/.test(flat)
  assert.equal(gardenWrite, false, flat.slice(0, 120))
  if (/\binsert into\s+public\.concepts\b/.test(flat)) {
    assert.equal(flat.startsWith('create or replace function public.save_experience_visualisation_provenance'), true)
  }
}

function cell(row: Row, column: string) {
  const value = row[column]
  return value === undefined ? null : value
}

function policyPasses(expression: string, row: Row, actor: string, db: Database) {
  const text = expression.replace(/\s+/g, ' ').trim().toLowerCase()
  const compact = text.replace(/\s+/g, '')
  if (compact === '((selectauth.uid())=user_id)' || compact === '(selectauth.uid())=user_id') return row.user_id === actor
  const curiosity = text.match(/^exists \( select 1 from public\.curiosities as curiosity where curiosity\.id = \w+\.curiosity_id and curiosity\.user_id = \(select auth\.uid\(\)\) \)$/)
  if (curiosity) return (db.rows.curiosities ?? []).some((item) => item.id === row.curiosity_id && item.user_id === actor)
  const experience = text.match(/^exists \( select 1 from public\.experiences as experience where experience\.id = \w+\.experience_id and experience\.user_id = \(select auth\.uid\(\)\) \)$/)
  if (experience) return (db.rows.experiences ?? []).some((item) => item.id === row.experience_id && item.user_id === actor)
  if (text === 'experience_id is not null and item_id is not null') return row.experience_id !== null && row.item_id !== null
  throw new Error(`Unrecognized policy expression: ${text}`)
}

function clause(policy: Policy, command: string) {
  if (command === 'insert') return policy.check ?? policy.using
  return policy.using ?? policy.check
}

function policiesAllow(table: string, command: string, actor: string, oldRow: Row | null, newRow: Row | null, db: Database) {
  if (!rls.has(table)) return true
  const applicable = policies.filter((policy) => (
    policy.table === table
    && policy.role === 'authenticated'
    && (policy.command === command || policy.command === 'all')
  ))
  const allowed = applicable.filter((policy) => !policy.restrictive)
  const restrictive = applicable.filter((policy) => policy.restrictive)
  if (allowed.length === 0) return false
  const passes = (policy: Policy, row: Row | null) => {
    const expression = clause(policy, command)
    if (!expression || !row) return false
    return policyPasses(expression, row, actor, db)
  }
  if (command === 'update') {
    if (!allowed.some((policy) => passes({ ...policy, check: null, using: policy.using ?? policy.check }, oldRow))) return false
    if (!restrictive.every((policy) => passes({ ...policy, check: null, using: policy.using ?? policy.check }, oldRow))) return false
    return allowed.some((policy) => passes(policy, newRow)) && restrictive.every((policy) => passes(policy, newRow))
  }
  const row = newRow ?? oldRow
  return allowed.some((policy) => passes(policy, row)) && restrictive.every((policy) => passes(policy, row))
}

function privilege(table: string, name: string, role: string) {
  return grants.get(table)?.get(role)?.has(name) ?? false
}

function evaluateProvenanceCheck(expression: string, row: Row) {
  const text = expression.replace(/\s+/g, ' ').trim().toLowerCase()
  if (text === "circle in ('concern', 'influence', 'control')") {
    return row.circle === 'concern' || row.circle === 'influence' || row.circle === 'control'
  }
  const shape = text.match(/^char_length\((\w+)\) between (\d+) and (\d+) and \1 = btrim\(\1\)$/)
  if (!shape) throw new Error(`Unevaluated provenance check: ${text}`)
  const value = row[shape[1]]
  if (typeof value !== 'string') return false
  return [...value].length >= Number(shape[2]) && [...value].length <= Number(shape[3]) && value.trim() === value
}

function foreignKeyHolds(key: ForeignKey, row: Row, db: Database) {
  const values = key.columns.map((column) => cell(row, column))
  if (values.some((value) => value === null)) return true
  return (db.rows[key.referencedTable] ?? []).some((parent) => (
    key.referencedColumns.every((column, index) => parent[column] === values[index])
  ))
}

function prepare(table: string, input: Row) {
  const row = { ...input }
  for (const column of tableColumns(table)) {
    if (row[column.name] !== undefined && row[column.name] !== null) continue
    if (column.hasDefault && row[column.name] === undefined) {
      row[column.name] = column.defaultValue
      continue
    }
    if (column.notNull) return { row, error: `not null ${column.name}` }
  }
  return { row, error: null }
}

function simpleGuard(body: string) {
  const flat = body.replace(/\s+/g, ' ').trim().toLowerCase()
  const match = flat.match(/^begin if new\.(\w+) is distinct from old\.\1 then raise exception '([^']+)'; end if; return new; end;$/)
  return match ? { column: match[1], message: match[2] } : null
}

function applyUpdateTriggers(table: string, before: Row, after: Row) {
  for (const trigger of triggers) {
    if (trigger.table !== table || trigger.level !== 'row' || trigger.timing !== 'before' || !trigger.event.includes('update')) continue
    const body = functions.get(trigger.function)?.body ?? ''
    if (trigger.function === 'preserve_experience_visualisation_source' || trigger.function === 'preserve_concept_experience_source') {
      const flat = body.replace(/\s+/g, ' ').toLowerCase()
      if (!flat.includes('new.original_text_snapshot is distinct from old.original_text_snapshot')) throw new Error('text not frozen')
      if (!flat.includes('new.circle is distinct from old.circle')) throw new Error('circle not frozen')
      if (!flat.includes('new.experience_id is distinct from old.experience_id and new.experience_id is not null')) throw new Error('experience retarget not blocked')
      if (!flat.includes('new.item_id is distinct from old.item_id and new.item_id is not null')) throw new Error('topic retarget not blocked')
      if (trigger.function === 'preserve_concept_experience_source' && !flat.includes('new.source_id is distinct from old.source_id and new.source_id is not null')) {
        throw new Error('source retarget not blocked')
      }
      if (trigger.function === 'preserve_concept_experience_source' && !flat.includes('new.origin_source_id is distinct from old.origin_source_id')) {
        throw new Error('origin not frozen')
      }
      const frozen = ['id', 'user_id', 'curiosity_id', 'circle', 'original_text_snapshot', 'created_at']
      if (trigger.function === 'preserve_concept_experience_source') frozen.push('concept_id', 'origin_source_id')
      for (const column of frozen) {
        if (cell(before, column) !== cell(after, column)) throw new Error('visualisation source is immutable')
      }
      if (cell(before, 'experience_id') !== cell(after, 'experience_id') && cell(after, 'experience_id') !== null) {
        throw new Error('visualisation source is immutable')
      }
      if (cell(before, 'item_id') !== cell(after, 'item_id') && cell(after, 'item_id') !== null) {
        throw new Error('visualisation source is immutable')
      }
      if (cell(before, 'source_id') !== cell(after, 'source_id') && cell(after, 'source_id') !== null) {
        throw new Error('visualisation source is immutable')
      }
      continue
    }
    const guard = simpleGuard(body)
    if (guard) {
      if (cell(before, guard.column) !== cell(after, guard.column)) throw new Error(guard.message)
      continue
    }
    const flat = body.replace(/\s+/g, ' ').toLowerCase()
    if (flat.includes("raise exception 'concept provenance is immutable'")) {
      for (const column of ['user_id', 'concept_id', 'original_text_snapshot', 'considered_text_snapshot']) {
        if (cell(before, column) !== cell(after, column)) throw new Error('concept provenance is immutable')
      }
      if (cell(before, 'question_id') !== cell(after, 'question_id') && cell(after, 'question_id') !== null) {
        throw new Error('a concept link can be detached, not retargeted')
      }
      continue
    }
    if (flat.includes('new.updated_at = now()')) continue
    if (flat.includes("raise exception 'the originating question cannot be replaced'")) {
      if (!flat.includes('public.concepts_origin_question_live')) throw new Error('origin clear must see through row level security')
      if (!flat.includes("raise exception 'the originating question cannot be cleared'")) throw new Error('a live origin must not be cleared by hand')
      const live = functions.get('concepts_origin_question_live')
      if (!live || live.security !== 'definer' || live.searchPath !== "''") throw new Error('origin existence check must be security definer')
      const originMigration = sqlFiles.get('20261126200000_concept_origin_question.sql') ?? ''
      const liveDeclaration = originMigration.slice(originMigration.indexOf('function public.concepts_origin_question_live'), originMigration.indexOf('revoke all on function public.concepts_origin_question_live'))
      if (!/language sql\s+volatile/i.test(liveDeclaration)) throw new Error('origin existence check must be volatile')
      if (/language sql\s+stable/i.test(liveDeclaration)) throw new Error('origin existence check must not be stable')
      if (!live.body.toLowerCase().includes('from public.questions')) throw new Error('origin existence check must read questions')
      if (functionExec.get('concepts_origin_question_live')?.has('authenticated')) throw new Error('origin existence check must not be executable by authenticated')
      const previous = cell(before, 'origin_question_id')
      const next = cell(after, 'origin_question_id')
      if (previous !== null && next !== null && previous !== next) throw new Error('the originating question cannot be replaced')
      if (previous !== null && next === null) {
        const deletingQuestion = referentialDeletes.some((item) => item.table === 'questions' && item.id === String(previous))
        if (!deletingQuestion) throw new Error('the originating question cannot be cleared')
      }
      continue
    }
    throw new Error(`Unhandled trigger ${trigger.function}`)
  }
  if (table === 'concept_experience_sources' || table === 'experience_visualisation_sources') {
    for (const check of checks.filter((item) => item.table === table)) {
      if (!evaluateProvenanceCheck(check.expression, after)) throw new Error(`check ${check.name}`)
    }
  }
}

function refers(key: ForeignKey, child: Row, parent: Row) {
  return key.columns.every((column, index) => {
    const value = cell(child, column)
    return value !== null && value === parent[key.referencedColumns[index]]
  })
}

function referencing(table: string, experienceOrder: 'creation' | 'reverse') {
  const keys = foreignKeys.filter((key) => key.referencedTable === table)
  return table === 'experiences' && experienceOrder === 'reverse' ? [...keys].reverse() : keys
}

function removeRow(db: Database, table: string, id: string) {
  db.rows[table] = (db.rows[table] ?? []).filter((row) => row.id !== id)
}

function replaceRow(db: Database, table: string, id: string, next: Row) {
  db.rows[table] = (db.rows[table] ?? []).map((row) => row.id === id ? next : row)
}

type Pending = { key: ForeignKey; parent: Row }

function clearExperienceLinks(db: Database, experienceId: string) {
  const fn = functions.get('clear_experience_visualisation_links')
  const flat = fn?.body.replace(/\s+/g, ' ').toLowerCase() ?? ''
  if (fn?.security !== 'definer' || fn.searchPath !== "''") throw new Error('experience deletion does not clear both live ids')
  if (!flat.includes('update public.experience_visualisation_sources') || !flat.includes('update public.concept_experience_sources')) {
    throw new Error('experience deletion does not clear both live ids')
  }
  if (!flat.includes('set experience_id = null') || !flat.includes('item_id = null')) {
    throw new Error('experience deletion does not clear both live ids')
  }
  for (const table of ['experience_visualisation_sources', 'concept_experience_sources']) {
    for (const child of [...(db.rows[table] ?? [])]) {
      if (child.experience_id !== experienceId) continue
      const next = { ...child, experience_id: null, item_id: null }
      applyUpdateTriggers(table, child, next)
      replaceRow(db, table, String(child.id), next)
    }
  }
}

let originPromotions = 0
const referentialDeletes: { table: string, id: string }[] = []

function conceptResolvesTo(db: Database, concept: Row, questionId: string) {
  const links = (db.rows.concept_questions ?? []).filter((link) => link.concept_id === concept.id && link.question_id)
  const prompt = String(concept.for_considered_text ?? '')
  const matched = [...new Set(links.flatMap((link) => String(link.considered_text_snapshot ?? '') === prompt ? [String(link.question_id)] : []))]
  if (matched.length === 1) return matched[0] === questionId
  if (matched.length > 1) return false
  if (links.length === 1) return String(links[0].question_id) === questionId
  return false
}

// Mirrors concepts_promote_origin. A direct delete is depth 1. Any deeper
// trigger delete, including a foreign-key cascade, is suppressed.
function promoteGardenOrigin(db: Database, deleted: Row, depth: number) {
  const fn = functions.get('concepts_promote_origin')
  if (!fn) throw new Error('origin promotion trigger is missing')
  if (fn.security !== 'definer') throw new Error('origin promotion must be security definer')
  if (fn.searchPath !== "''") throw new Error('origin promotion must use an empty search_path')
  const flat = fn.body.replace(/\s+/g, ' ').toLowerCase()
  if (!flat.includes('pg_catalog.pg_trigger_depth() > 1')) throw new Error('cascade deletes must not promote')
  if (!flat.includes('from public.curiosities')) throw new Error('promotion must confirm the curiosity')
  if (!flat.includes('from public.questions')) throw new Error('promotion must confirm the question')
  const questionAt = flat.indexOf('from public.questions')
  if (flat.slice(questionAt, questionAt + 240).includes('for update')) throw new Error('promotion must not lock the question row')
  if (!flat.includes('for update of candidate')) throw new Error('promotion must lock the successor')
  if (!flat.includes('order by candidate.created_at, candidate.id')) throw new Error('promotion order')
  if (!flat.includes('from public.concept_experience_sources')) throw new Error('promotion must exclude experience concepts')
  if (!flat.includes('candidate.origin_question_id is null')) throw new Error('promotion must leave stored origins unchanged')
  if (!flat.includes('when unique_violation then')) throw new Error('unique conflicts must abort the delete')
  if (flat.includes('delete from')) throw new Error('promotion must not delete concepts')
  if (functionExec.get('concepts_promote_origin')?.has('authenticated')) throw new Error('promotion must not be executable by authenticated')
  if (cell(deleted, 'origin_question_id') === null) return
  if (depth > 1) return
  const curiosity = (db.rows.curiosities ?? []).find((item) => item.id === deleted.curiosity_id && item.user_id === deleted.user_id)
  if (!curiosity) return
  const question = (db.rows.questions ?? []).find((item) => item.id === deleted.origin_question_id && item.user_id === deleted.user_id && item.curiosity_id === deleted.curiosity_id)
  if (!question) return
  const successors = (db.rows.concepts ?? []).filter((concept) => (
    concept.id !== deleted.id
    && concept.user_id === deleted.user_id
    && concept.curiosity_id === deleted.curiosity_id
    && (concept.origin_question_id ?? null) === null
    && !(db.rows.concept_experience_sources ?? []).some((source) => source.concept_id === concept.id)
    && conceptResolvesTo(db, concept, String(deleted.origin_question_id))
  )).sort((left, right) => String(left.created_at ?? '').localeCompare(String(right.created_at ?? '')) || String(left.id).localeCompare(String(right.id)))
  const successor = successors[0]
  if (!successor) return
  const next = { ...successor, origin_question_id: deleted.origin_question_id }
  applyUpdateTriggers('concepts', successor, next)
  replaceRow(db, 'concepts', String(successor.id), next)
  originPromotions += 1
}

function removeReferential(db: Database, table: string, row: Row, pending: Pending[], experienceOrder: 'creation' | 'reverse', depth = 1) {
  referentialDeletes.push({ table, id: String(row.id) })
  try {
  if (table === 'experiences') clearExperienceLinks(db, String(row.id))
  for (const key of referencing(table, experienceOrder)) {
    const children = [...(db.rows[key.table] ?? [])].filter((child) => refers(key, child, row))
    if (key.onDelete.kind === 'cascade') {
      for (const child of children) removeReferential(db, key.table, child, pending, experienceOrder, depth + 1)
      continue
    }
    if (key.onDelete.kind === 'restrict') {
      if (children.length > 0) throw new Error(`restrict ${key.name}`)
      continue
    }
    if (key.onDelete.kind === 'no action') {
      pending.push({ key, parent: row })
      continue
    }
    const nulls = key.onDelete.columns ?? key.columns
    for (const child of children) {
      const next = { ...child }
      for (const column of nulls) next[column] = null
      applyUpdateTriggers(key.table, child, next)
      replaceRow(db, key.table, String(child.id), next)
    }
  }
  if (table === 'concepts') promoteGardenOrigin(db, row, depth)
  removeRow(db, table, String(row.id))
  } finally {
    referentialDeletes.pop()
  }
}

function stillReferenced(db: Database, pending: Pending) {
  return (db.rows[pending.key.table] ?? []).some((child) => refers(pending.key, child, pending.parent))
}

function captureSourceRow(row: Row, database: Database): { row: Row; error: string | null } {
  const flat = functions.get('capture_experience_visualisation_source')?.body.replace(/\s+/g, ' ').toLowerCase() ?? ''
  if (!flat.includes('new.circle := topic.circle') || !flat.includes('new.original_text_snapshot := topic.body')) {
    return { row, error: 'capture function does not copy the live topic' }
  }
  if (!flat.includes('new.created_at := pg_catalog.now()')) {
    return { row, error: 'capture function does not set the database clock' }
  }
  if (cell(row, 'experience_id') === null || cell(row, 'item_id') === null) {
    return { row, error: 'a visualisation source needs its experience and topic' }
  }
  const item = (database.rows.experience_circle_items ?? []).find((candidate) => (
    candidate.id === row.item_id && candidate.user_id === row.user_id && candidate.experience_id === row.experience_id
  ))
  if (!item) return { row, error: 'that topic is not in this experience' }
  const experience = (database.rows.experiences ?? []).find((candidate) => (
    candidate.id === row.experience_id && candidate.user_id === row.user_id && candidate.curiosity_id === row.curiosity_id
  ))
  if (!experience) return { row, error: 'that experience is not in this curiosity' }
  return {
    row: {
      ...row,
      circle: cell(item, 'circle'),
      original_text_snapshot: cell(item, 'body'),
      created_at: '2026-11-24T00:00:00.000Z',
    },
    error: null,
  }
}

function insert(db: Database, table: string, input: Row, actor: string) {
  if (!privilege(table, 'insert', 'authenticated')) return { db, error: 'privilege' }
  const prepared = prepare(table, input)
  if (prepared.error) return { db, error: prepared.error }
  let row = prepared.row
  if (table === 'experience_visualisation_sources') {
    const captured = captureSourceRow(row, db)
    if (captured.error) return { db, error: captured.error }
    row = captured.row
  }
  if (table === 'concept_experience_sources' || table === 'experience_visualisation_sources') {
    for (const check of checks.filter((item) => item.table === table)) {
      if (!evaluateProvenanceCheck(check.expression, row)) return { db, error: `check ${check.name}` }
    }
  }
  if (!policiesAllow(table, 'insert', actor, null, row, db)) return { db, error: 'policy' }
  for (const key of uniqueKeys.filter((item) => item.table === table)) {
    const values = key.columns.map((column) => cell(row, column))
    if (values.some((value) => value === null)) continue
    const conflict = (db.rows[table] ?? []).some((existing) => key.columns.every((column, index) => existing[column] === values[index]))
    if (conflict) return { db, error: `unique ${key.name}` }
  }
  for (const key of foreignKeys.filter((item) => item.table === table)) {
    if (!foreignKeyHolds(key, row, db)) return { db, error: `foreign key ${key.name}` }
  }
  const draft: Database = { rows: { ...db.rows, [table]: [...(db.rows[table] ?? []), row] } }
  return { db: draft, error: null }
}

function savedProvenance(database: Database, sourceId: string, actor: string) {
  return (database.rows.concept_experience_sources ?? []).find((row) => row.origin_source_id === sourceId && row.user_id === actor)
}

function copyProvenance(database: Database, conceptId: string, sourceId: string, actor: string, phase: 'full' | 'after-lock' = 'full') {
  if (!functionExec.get('save_experience_visualisation_provenance')?.has('authenticated')) {
    return { db: database, error: 'privilege' }
  }
  if (phase === 'full') {
    const existing = savedProvenance(database, sourceId, actor)
    if (existing) {
      if (existing.concept_id === conceptId) return { db: database, error: null, row: existing }
      return { db: database, error: 'that visualisation has already been saved' }
    }
  }
  const source = (database.rows.experience_visualisation_sources ?? []).find((row) => row.id === sourceId && row.user_id === actor)
  if (!source) {
    const saved = savedProvenance(database, sourceId, actor)
    if (saved) {
      if (saved.concept_id === conceptId) return { db: database, error: null, row: saved }
      return { db: database, error: 'that visualisation has already been saved' }
    }
    return { db: database, error: 'that visualisation source is not available' }
  }
  if (String(source.created_at ?? '') !== '2026-11-24T00:00:00.000Z') {
    const createdAt = Date.parse(String(source.created_at ?? ''))
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000) {
      return { db: database, error: 'that visualisation has expired' }
    }
  }
  const locked = savedProvenance(database, sourceId, actor)
  if (locked) {
    if (locked.concept_id === conceptId) return { db: database, error: null, row: locked }
    return { db: database, error: 'that visualisation has already been saved' }
  }
  const concept = (database.rows.concepts ?? []).find((row) => row.id === conceptId)
  if (concept) {
    if (concept.user_id !== actor || concept.curiosity_id !== source.curiosity_id) {
      return { db: database, error: 'that concept is not in this curiosity' }
    }
    return { db: database, error: 'that concept is not available for this visualisation' }
  }
  const provenance: Row = {
    id: `copied-${conceptId}`,
    concept_id: conceptId,
    user_id: actor,
    curiosity_id: source.curiosity_id,
    experience_id: source.experience_id,
    item_id: source.item_id,
    circle: source.circle,
    original_text_snapshot: source.original_text_snapshot,
    origin_source_id: source.id,
    source_id: source.id,
  }
  const conceptRow: Row = {
    id: conceptId,
    user_id: actor,
    curiosity_id: source.curiosity_id,
    title: 'Held Force',
    for_considered_text: 'A held tension between expectation and evidence.',
    image_path: `${actor}/${conceptId}/kept.webp`,
    image_model: 'gpt-image-2.5-flare',
    prompt_version: 'image-eval-1',
  }
  for (const check of checks.filter((item) => item.table === 'concept_experience_sources')) {
    if (!evaluateProvenanceCheck(check.expression, provenance)) return { db: database, error: `check ${check.name}` }
  }
  const withConcept: Database = {
    rows: {
      ...database.rows,
      concepts: [...(database.rows.concepts ?? []), conceptRow],
    },
  }
  for (const key of uniqueKeys.filter((item) => item.table === 'concept_experience_sources')) {
    const values = key.columns.map((column) => cell(provenance, column))
    if (values.some((value) => value === null)) continue
    const conflict = (database.rows.concept_experience_sources ?? []).some((row) => key.columns.every((column, index) => row[column] === values[index]))
    if (conflict) return { db: database, error: `unique ${key.name}` }
  }
  for (const key of foreignKeys.filter((item) => item.table === 'concept_experience_sources')) {
    if (!foreignKeyHolds(key, provenance, withConcept)) return { db: database, error: `foreign key ${key.name}` }
  }
  const draft: Database = {
    rows: {
      ...withConcept.rows,
      concept_experience_sources: [...(database.rows.concept_experience_sources ?? []), provenance],
    },
  }
  return { db: draft, error: null, row: provenance }
}

function remove(db: Database, table: string, id: string, actor: string, experienceOrder: 'creation' | 'reverse') {
  if (!privilege(table, 'delete', 'authenticated')) return { db, error: 'privilege' }
  const row = (db.rows[table] ?? []).find((item) => item.id === id)
  if (!row) return { db, error: 'missing' }
  if (!policiesAllow(table, 'delete', actor, row, null, db)) return { db, error: 'policy' }
  const draft: Database = structuredClone(db)
  const pending: Pending[] = []
  try {
    removeReferential(draft, table, row, pending, experienceOrder)
    if (pending.some((item) => stillReferenced(draft, item))) return { db, error: 'foreign key' }
  } catch (error) {
    return { db, error: error instanceof Error ? error.message : 'referential' }
  }
  return { db: draft, error: null }
}

function update(db: Database, table: string, id: string, changes: Row, actor: string) {
  if (!privilege(table, 'update', 'authenticated')) return { db, error: 'privilege' }
  const row = (db.rows[table] ?? []).find((item) => item.id === id)
  if (!row) return { db, error: 'missing' }
  const next = { ...row, ...changes }
  if (!policiesAllow(table, 'update', actor, row, next, db)) return { db, error: 'policy' }
  try {
    applyUpdateTriggers(table, row, next)
  } catch (error) {
    return { db, error: error instanceof Error ? error.message : 'trigger' }
  }
  const draft: Database = structuredClone(db)
  replaceRow(draft, table, id, next)
  return { db: draft, error: null }
}

const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const curiosityA = '11111111-1111-4111-8111-111111111111'
const curiosityB = '22222222-2222-4222-8222-222222222222'
const curiosityOther = '33333333-3333-4333-8333-333333333333'
const experienceA = '44444444-4444-4444-8444-444444444444'
const experienceB = '55555555-5555-4555-8555-555555555555'
const experienceOther = '66666666-6666-4666-8666-666666666666'
const itemA = '77777777-7777-4777-8777-777777777777'
const itemB = '88888888-8888-4888-8888-888888888888'
const itemOther = '99999999-9999-4999-8999-999999999999'
const conceptExperience = 'abababab-abab-4bab-8bab-abababababab'
const conceptGarden = 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd'
const questionGarden = 'edededed-eded-4ded-8ded-edededededed'
const linkGarden = 'fefefefe-fefe-4fef-8fef-fefefefefefe'
const provenanceId = '01010101-0101-4101-8101-010101010101'
const topicText = 'Whether a market narrative gathers force'

let db: Database = { rows: { 'auth.users': [{ id: userA }, { id: userB }] } }
function mustInsert(table: string, row: Row, actor = userA) {
  const result = insert(db, table, row, actor)
  assert.equal(result.error, null, `${table}: ${result.error}`)
  db = result.db
}
mustInsert('curiosities', { id: curiosityA, user_id: userA, name: 'Market' })
mustInsert('curiosities', { id: curiosityB, user_id: userA, name: 'Materials' })
mustInsert('curiosities', { id: curiosityOther, user_id: userB, name: 'Other garden' }, userB)
mustInsert('experiences', { id: experienceA, user_id: userA, curiosity_id: curiosityA })
mustInsert('experiences', { id: experienceB, user_id: userA, curiosity_id: curiosityB })
mustInsert('experiences', { id: experienceOther, user_id: userB, curiosity_id: curiosityOther }, userB)
mustInsert('experience_circle_items', { id: itemA, user_id: userA, experience_id: experienceA, circle: 'concern', body: topicText })
mustInsert('experience_circle_items', { id: itemB, user_id: userA, experience_id: experienceB, circle: 'influence', body: 'A second topic' })
mustInsert('experience_circle_items', { id: itemOther, user_id: userB, experience_id: experienceOther, circle: 'control', body: 'Another person' }, userB)
function conceptRow(id: string, curiosityId: string, userId: string): Row {
  return {
    id,
    user_id: userId,
    curiosity_id: curiosityId,
    title: 'Held Force',
    for_considered_text: 'A held tension between expectation and evidence.',
    image_path: `${userId}/${id}/held.webp`,
    image_model: 'gpt-image-2.5-flare',
    prompt_version: 'image-eval-1',
  }
}
mustInsert('concepts', conceptRow(conceptGarden, curiosityA, userA))
mustInsert('questions', { id: questionGarden, user_id: userA, curiosity_id: curiosityA, original_text: 'When should the garden stay a question?' })
mustInsert('concept_questions', {
  id: linkGarden,
  concept_id: conceptGarden,
  question_id: questionGarden,
  user_id: userA,
  curiosity_id: curiosityA,
  original_text_snapshot: 'When should the garden stay a question?',
})
const conceptAfterTopicDelete = '21212121-2121-4121-8121-212121212121'
const conceptAfterExperienceDelete = '23232323-2323-4232-8232-232323232323'
const conceptOtherCuriosity = '24242424-2424-4242-8242-242424242424'
const sourceForTopic = '30303030-3030-4030-8030-303030303030'
const sourceForExperience = '31313131-3131-4131-8131-313131313131'
mustInsert('concepts', conceptRow(conceptOtherCuriosity, curiosityB, userA))
function gardenLink() {
  return db.rows.concept_questions.find((item) => item.id === linkGarden) ?? null
}
const gardenBefore = JSON.stringify(gardenLink())
const questionBefore = JSON.stringify(db.rows.questions.find((item) => item.id === questionGarden))

const forgedSource = insert(db, 'experience_visualisation_sources', {
  id: provenanceId,
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: experienceA,
  item_id: itemA,
  circle: 'control',
  original_text_snapshot: 'A forged topic the browser wrote',
}, userA)
assert.equal(forgedSource.error, null)
db = forgedSource.db
const opened = db.rows.experience_visualisation_sources.find((row) => row.id === provenanceId)
assert.ok(opened)
assert.equal(opened.original_text_snapshot, topicText)
assert.equal(opened.circle, 'concern')
assert.equal(opened.experience_id, experienceA)
assert.equal(opened.item_id, itemA)
assert.equal(update(db, 'experience_visualisation_sources', provenanceId, { original_text_snapshot: 'A forged topic', circle: 'control' }, userA).error, 'privilege')
assert.equal(opened.original_text_snapshot, topicText)
assert.equal(opened.circle, 'concern')
for (const sourceId of [sourceForTopic, sourceForExperience]) {
  const captured = insert(db, 'experience_visualisation_sources', {
    id: sourceId,
    user_id: userA,
    curiosity_id: curiosityA,
    experience_id: experienceA,
    item_id: itemA,
    circle: 'control',
    original_text_snapshot: 'A forged topic the browser wrote',
  }, userA)
  assert.equal(captured.error, null)
  db = captured.db
  assert.equal(db.rows.experience_visualisation_sources.find((row) => row.id === sourceId)?.original_text_snapshot, topicText)
}

const invented = insert(db, 'concept_experience_sources', {
  id: '12121212-1212-4121-8121-121212121212',
  concept_id: conceptExperience,
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: null,
  item_id: null,
  circle: 'control',
  original_text_snapshot: 'A forged topic the browser wrote',
}, userA)
assert.equal(invented.error, 'privilege')
assert.equal(insert(db, 'experience_visualisation_sources', {
  id: '13131313-1313-4131-8131-131313131313',
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: null,
  item_id: null,
  circle: 'concern',
  original_text_snapshot: topicText,
}, userA).error, 'a visualisation source needs its experience and topic')
assert.equal(insert(db, 'experience_visualisation_sources', {
  id: '14141414-1414-4141-8141-141414141414',
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: experienceB,
  item_id: itemB,
  circle: 'concern',
  original_text_snapshot: topicText,
}, userA).error, 'that experience is not in this curiosity')
assert.equal(insert(db, 'experience_visualisation_sources', {
  id: '15151515-1515-4151-8151-151515151515',
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: experienceA,
  item_id: itemOther,
  circle: 'concern',
  original_text_snapshot: topicText,
}, userA).error, 'that topic is not in this experience')
assert.equal(copyProvenance(db, conceptExperience, provenanceId, userB).error, 'that visualisation source is not available')
assert.equal(copyProvenance(db, conceptOtherCuriosity, provenanceId, userA).error, 'that concept is not in this curiosity')

const saved = copyProvenance(db, conceptExperience, provenanceId, userA)
assert.equal(saved.error, null)
db = saved.db
const first = db.rows.concept_experience_sources.find((row) => row.concept_id === conceptExperience)
assert.ok(first)
assert.equal(first.original_text_snapshot, topicText)
assert.equal(first.circle, 'concern')
assert.equal(first.experience_id, experienceA)
assert.equal(first.item_id, itemA)
assert.equal(first.source_id, provenanceId)
assert.equal(first.origin_source_id, provenanceId)
assert.equal(db.rows.concepts.some((row) => row.id === conceptExperience), true)
const retry = copyProvenance(db, conceptExperience, provenanceId, userA)
assert.equal(retry.error, null)
assert.equal(db.rows.concept_experience_sources.filter((row) => row.source_id === provenanceId).length, 1)
assert.equal(copyProvenance(db, conceptAfterTopicDelete, provenanceId, userA).error, 'that visualisation has already been saved')
assert.equal(copyProvenance(db, conceptGarden, sourceForTopic, userA).error, 'that concept is not available for this visualisation')
assert.equal(db.rows.concept_experience_sources.length, 1)
assert.equal(update(db, 'concept_experience_sources', String(first.id), { circle: 'control', original_text_snapshot: 'A forged topic' }, userA).error, 'privilege')
assert.equal(remove(db, 'concept_experience_sources', String(first.id), userA, 'creation').error, 'privilege')

const liveItem = db.rows.experience_circle_items.find((row) => row.id === itemA)
assert.ok(liveItem)
liveItem.body = 'A later edit of the concern'
liveItem.circle = 'influence'
assert.equal(first.original_text_snapshot, topicText)
assert.equal(first.circle, 'concern')
assert.equal(JSON.stringify(gardenLink()), gardenBefore)

const concurrentSource = '38383838-3838-4383-8383-383838383838'
const concurrentConcept = '39393939-3939-4393-8393-393939393939'
const concurrentOther = '40404040-4040-4404-8404-404040404040'
const concurrentOpened = insert(db, 'experience_visualisation_sources', {
  id: concurrentSource,
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: experienceA,
  item_id: itemA,
  circle: 'control',
  original_text_snapshot: 'A forged topic the browser wrote',
}, userA)
assert.equal(concurrentOpened.error, null)
assert.equal(savedProvenance(concurrentOpened.db, concurrentSource, userA), undefined)
const concurrentWinner = copyProvenance(concurrentOpened.db, concurrentConcept, concurrentSource, userA)
assert.equal(concurrentWinner.error, null)
const concurrentSame = copyProvenance(concurrentWinner.db, concurrentConcept, concurrentSource, userA, 'after-lock')
assert.equal(concurrentSame.error, null)
assert.equal(concurrentSame.row?.concept_id, concurrentConcept)
assert.equal(concurrentSame.row?.original_text_snapshot, concurrentOpened.db.rows.experience_visualisation_sources.find((row) => row.id === concurrentSource)?.original_text_snapshot)
assert.equal(concurrentWinner.db.rows.concepts.filter((row) => row.id === concurrentConcept).length, 1)
assert.equal(concurrentWinner.db.rows.concept_experience_sources.filter((row) => row.origin_source_id === concurrentSource).length, 1)
const concurrentDifferent = copyProvenance(concurrentWinner.db, concurrentOther, concurrentSource, userA, 'after-lock')
assert.equal(concurrentDifferent.error, 'that visualisation has already been saved')
assert.equal(concurrentDifferent.db.rows.concepts.some((row) => row.id === concurrentOther), false)
assert.equal(concurrentDifferent.db.rows.concept_experience_sources.filter((row) => row.origin_source_id === concurrentSource).length, 1)
const releasedDuringWait = remove(concurrentWinner.db, 'experience_visualisation_sources', concurrentSource, userA, 'creation')
assert.equal(releasedDuringWait.error, null)
const retryAfterSourceGone = copyProvenance(releasedDuringWait.db, concurrentConcept, concurrentSource, userA, 'after-lock')
assert.equal(retryAfterSourceGone.error, null)
assert.equal(retryAfterSourceGone.row?.concept_id, concurrentConcept)
assert.equal(retryAfterSourceGone.row?.origin_source_id, concurrentSource)
assert.equal(retryAfterSourceGone.row?.original_text_snapshot, concurrentWinner.row?.original_text_snapshot)
assert.equal(copyProvenance(releasedDuringWait.db, concurrentOther, concurrentSource, userA, 'after-lock').error, 'that visualisation has already been saved')
assert.equal(releasedDuringWait.db.rows.concepts.filter((row) => row.id === concurrentConcept).length, 1)
const nulled = structuredClone(concurrentOpened.db)
const nulledSource = nulled.rows.experience_visualisation_sources.find((row) => row.id === concurrentSource)
assert.ok(nulledSource)
nulledSource.experience_id = null
nulledSource.item_id = null
const nullConcept = '41414141-4141-4414-8414-414141414141'
const savedWithNullParents = copyProvenance(nulled, nullConcept, concurrentSource, userA)
assert.equal(savedWithNullParents.error, null)
assert.equal(savedWithNullParents.row?.experience_id, null)
assert.equal(savedWithNullParents.row?.item_id, null)
assert.equal(savedWithNullParents.row?.original_text_snapshot, nulledSource.original_text_snapshot)
assert.equal(savedWithNullParents.row?.circle, nulledSource.circle)

const ready = structuredClone(db)
const topicDeleted = remove(ready, 'experience_circle_items', itemA, userA, 'creation')
assert.equal(topicDeleted.error, null)
const sourceAfterTopic = topicDeleted.db.rows.experience_visualisation_sources.find((row) => row.id === provenanceId)
const provenanceAfterTopic = topicDeleted.db.rows.concept_experience_sources.find((row) => row.concept_id === conceptExperience)
assert.ok(sourceAfterTopic && provenanceAfterTopic)
assert.equal(sourceAfterTopic.item_id, null)
assert.equal(sourceAfterTopic.experience_id, experienceA)
assert.equal(sourceAfterTopic.original_text_snapshot, topicText)
assert.equal(sourceAfterTopic.circle, 'concern')
assert.equal(provenanceAfterTopic.item_id, null)
assert.equal(provenanceAfterTopic.original_text_snapshot, topicText)
assert.equal(provenanceAfterTopic.circle, 'concern')
const savedAfterTopic = copyProvenance(topicDeleted.db, conceptAfterTopicDelete, sourceForTopic, userA)
assert.equal(savedAfterTopic.error, null)
const topicSave = savedAfterTopic.db.rows.concept_experience_sources.find((row) => row.concept_id === conceptAfterTopicDelete)
assert.ok(topicSave)
assert.equal(topicSave.original_text_snapshot, topicText)
assert.equal(topicSave.circle, 'concern')
assert.equal(topicSave.item_id, null)
assert.equal(topicSave.experience_id, experienceA)

function experienceDeletion(order: 'creation' | 'reverse') {
  const result = remove(ready, 'experiences', experienceA, userA, order)
  assert.equal(result.error, null, order)
  const source = result.db.rows.experience_visualisation_sources.find((row) => row.id === provenanceId)
  const kept = result.db.rows.concept_experience_sources.find((row) => row.concept_id === conceptExperience)
  assert.ok(source && kept)
  assert.equal(source.experience_id, null)
  assert.equal(source.original_text_snapshot, topicText)
  assert.equal(source.circle, 'concern')
  assert.equal(kept.experience_id, null)
  assert.equal(kept.original_text_snapshot, topicText)
  assert.equal(kept.circle, 'concern')
  assert.equal(result.db.rows.experiences.some((row) => row.id === experienceA), false)
  assert.equal(result.db.rows.experience_circle_items.some((row) => row.id === itemA), false)
  return { result, source }
}
const createdFirst = experienceDeletion('creation')
assert.equal(createdFirst.source.item_id, null)
const savedAfterExperience = copyProvenance(createdFirst.result.db, conceptAfterExperienceDelete, sourceForExperience, userA)
assert.equal(savedAfterExperience.error, null)
const experienceSave = savedAfterExperience.db.rows.concept_experience_sources.find((row) => row.concept_id === conceptAfterExperienceDelete)
assert.ok(experienceSave)
assert.equal(experienceSave.original_text_snapshot, topicText)
assert.equal(experienceSave.circle, 'concern')
assert.equal(experienceSave.experience_id, null)
assert.equal(experienceSave.item_id, null)
assert.equal(createdFirst.source.item_id, null)
const reversed = experienceDeletion('reverse')
assert.equal(reversed.source.item_id, null)
const reversedKept = reversed.result.db.rows.concept_experience_sources.find((row) => row.concept_id === conceptExperience)
assert.equal(reversedKept?.item_id, null)
assert.equal(reversedKept?.experience_id, null)
assert.equal(reversedKept?.origin_source_id, provenanceId)
assert.equal(reversedKept?.original_text_snapshot, topicText)
assert.equal(foreignKeyHolds(foreignKeys.find((key) => key.name === 'experience_visualisation_sources_item_owner') ?? itemKey, reversed.source, reversed.result.db), true)

const sourceRemoved = remove(ready, 'experience_visualisation_sources', provenanceId, userA, 'creation')
assert.equal(sourceRemoved.error, null)
assert.equal(sourceRemoved.db.rows.experience_visualisation_sources.some((row) => row.id === provenanceId), false)
const keptAfterSourceDelete = sourceRemoved.db.rows.concept_experience_sources.find((row) => row.concept_id === conceptExperience)
assert.ok(keptAfterSourceDelete)
assert.equal(keptAfterSourceDelete.original_text_snapshot, topicText)
assert.equal(keptAfterSourceDelete.circle, 'concern')
assert.equal(keptAfterSourceDelete.source_id, null)
assert.equal(keptAfterSourceDelete.origin_source_id, provenanceId)
const retryAfterDelete = copyProvenance(sourceRemoved.db, conceptExperience, provenanceId, userA)
assert.equal(retryAfterDelete.error, null)
assert.equal(retryAfterDelete.row?.original_text_snapshot, topicText)
assert.equal(retryAfterDelete.row?.circle, 'concern')
assert.equal(sourceRemoved.db.rows.concept_experience_sources.filter((row) => row.origin_source_id === provenanceId).length, 1)
assert.equal(copyProvenance(sourceRemoved.db, conceptAfterTopicDelete, provenanceId, userA).error, 'that visualisation has already been saved')
const unsavedId = '35353535-3535-4353-8353-353535353535'
const unsavedConcept = '36363636-3636-4363-8363-363636363636'
const unsavedInsert = insert(ready, 'experience_visualisation_sources', {
  id: unsavedId,
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: experienceA,
  item_id: itemA,
  circle: 'control',
  original_text_snapshot: 'A forged topic the browser wrote',
}, userA)
assert.equal(unsavedInsert.error, null)
const unsavedGone = remove(unsavedInsert.db, 'experience_visualisation_sources', unsavedId, userA, 'creation')
assert.equal(unsavedGone.error, null)
assert.equal(copyProvenance(unsavedGone.db, unsavedConcept, unsavedId, userA).error, 'that visualisation source is not available')
assert.equal(unsavedGone.db.rows.concepts.some((row) => row.id === unsavedConcept), false)

const conceptDeleted = remove(ready, 'concepts', conceptExperience, userA, 'creation')
assert.equal(conceptDeleted.error, null)
assert.equal(conceptDeleted.db.rows.concept_experience_sources.some((row) => row.concept_id === conceptExperience), false)
assert.equal(conceptDeleted.db.rows.experience_visualisation_sources.some((row) => row.id === provenanceId), true)
assert.equal(JSON.stringify(conceptDeleted.db.rows.concept_questions.find((row) => row.id === linkGarden)), gardenBefore)
assert.equal(JSON.stringify(conceptDeleted.db.rows.questions.find((row) => row.id === questionGarden)), questionBefore)

const curiosityDeleted = remove(ready, 'curiosities', curiosityA, userA, 'creation')
assert.equal(curiosityDeleted.error, null)
assert.equal(curiosityDeleted.db.rows.concept_experience_sources.length, 0)
assert.equal(curiosityDeleted.db.rows.experience_visualisation_sources.length, 0)
assert.equal(curiosityDeleted.db.rows.concepts.some((row) => row.curiosity_id === curiosityA), false)
assert.equal(curiosityDeleted.db.rows.experiences.some((row) => row.id === experienceB), true)
assert.equal(curiosityDeleted.db.rows.concept_questions.some((row) => row.id === linkGarden), false)

const emptyMembership = policyPasses(membership.using ?? '', { curiosity_id: curiosityOther, user_id: userA }, userA, db)
assert.equal(emptyMembership, false)
const liveExpression = liveSource.check ?? ''
assert.equal(policyPasses(liveExpression, { experience_id: null, item_id: null }, userA, db), false)
assert.equal(policyPasses(liveExpression, { experience_id: experienceA, item_id: itemA }, userA, db), true)

const staleId = '32323232-3232-4232-8232-323232323232'
const staleConcept = '34343434-3434-4434-8434-343434343434'
const stale = insert(ready, 'experience_visualisation_sources', {
  id: staleId,
  user_id: userA,
  curiosity_id: curiosityA,
  experience_id: experienceA,
  item_id: itemA,
  circle: 'concern',
  original_text_snapshot: topicText,
  created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
}, userA)
assert.equal(stale.error, null)
assert.equal(stale.db.rows.experience_visualisation_sources.find((row) => row.id === staleId)?.created_at, '2026-11-24T00:00:00.000Z')
assert.equal(copyProvenance(stale.db, staleConcept, staleId, userA).error, null)
const aged = structuredClone(stale.db)
const agedRow = aged.rows.experience_visualisation_sources.find((row) => row.id === staleId)
assert.ok(agedRow)
agedRow.created_at = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
const agedConcept = '37373737-3737-4373-8373-373737373737'
assert.equal(copyProvenance(aged, agedConcept, staleId, userA).error, 'that visualisation has expired')
assert.equal(aged.rows.concepts.some((row) => row.id === agedConcept), false)

const firstBloom = '45454545-4545-4454-8454-454545454545'
const secondBloom = '46464646-4646-4464-8464-464646464646'
const experienceBloom = '47474747-4747-4474-8474-474747474747'
const bloomFields = {
  user_id: userA,
  curiosity_id: curiosityA,
  title: 'First Bloom',
  for_considered_text: 'A held tension between expectation and evidence.',
  image_model: 'gpt-image-2.5-flare',
  prompt_version: 'image-eval-1',
}
const firstSaved = insert(ready, 'concepts', {
  ...bloomFields,
  id: firstBloom,
  image_path: `${userA}/${firstBloom}/kept.webp`,
  origin_question_id: questionGarden,
}, userA)
assert.equal(firstSaved.error, null)
const duplicateSaved = insert(firstSaved.db, 'concepts', {
  ...bloomFields,
  id: secondBloom,
  image_path: `${userA}/${secondBloom}/kept.webp`,
  origin_question_id: questionGarden,
}, userA)
assert.equal(duplicateSaved.error, 'unique concepts_one_origin_question')
assert.equal(duplicateSaved.db.rows.concepts.some((row) => row.id === secondBloom), false)
const experienceSaved = insert(firstSaved.db, 'concepts', {
  ...bloomFields,
  id: experienceBloom,
  title: 'Topic Form',
  image_path: `${userA}/${experienceBloom}/kept.webp`,
  origin_question_id: null,
}, userA)
assert.equal(experienceSaved.error, null)
const replaced = update(firstSaved.db, 'concepts', firstBloom, { origin_question_id: '48484848-4848-4484-8484-484848484848' }, userA)
assert.equal(replaced.error, 'the originating question cannot be replaced')
const questionDeleted = remove(firstSaved.db, 'questions', questionGarden, userA, 'creation')
assert.equal(questionDeleted.error, null)
const keptConcept = questionDeleted.db.rows.concepts.find((row) => row.id === firstBloom)
assert.equal(keptConcept?.origin_question_id ?? null, null)
assert.equal(questionDeleted.db.rows.concepts.some((row) => row.id === conceptGarden), true)

const promotionTrigger = triggers.find((trigger) => trigger.function === 'concepts_promote_origin')
assert.equal(promotionTrigger?.timing, 'after')
assert.equal(promotionTrigger?.event, 'delete')
assert.equal(promotionTrigger?.table, 'concepts')
assert.equal(functionExec.get('concepts_promote_origin')?.has('authenticated') ?? false, false)

const blossomPrompt = 'One question, one blossom.'
const sharedQuestion = '51515151-5151-4151-8151-515151515151'
const otherQuestion = '52525252-5252-4252-8252-525252525252'
const representative = '61616161-6161-4161-8161-616161616161'
const februaryEarly = '62626262-6262-4262-8262-626262626262'
const februaryLate = '63636363-6363-4363-8363-636363636363'
const aprilSmallerId = '60606060-6060-4060-8060-606060606060'
const experienceHistorical = '64646464-6464-4464-8464-646464646464'
const otherOriginConcept = '65656565-6565-4565-8565-656565656565'
const ambiguousConcept = '66666666-6666-4666-8666-666666666666'
const soleConcept = '67676767-6767-4676-8676-676767676767'
const soleQuestion = '53535353-5353-4353-8353-535353535353'
const cleanupConcept = '68686868-6868-4686-8686-686868686868'
const cleanupQuestion = '54545454-5454-4454-8454-545454545454'
const cleanupHistorical = '69696969-6969-4696-8696-696969696969'
const severalSources = '6d6d6d6d-6d6d-46d6-86d6-6d6d6d6d6d6d'
function blossomRow(id: string, createdAt: string, title: string, origin: string | null) {
  return {
    ...conceptRow(id, curiosityA, userA),
    title,
    for_considered_text: blossomPrompt,
    created_at: createdAt,
    origin_question_id: origin,
  }
}
function blossomLink(id: string, conceptId: string, questionId: string, considered: string | null) {
  return {
    id,
    concept_id: conceptId,
    question_id: questionId,
    user_id: userA,
    curiosity_id: curiosityA,
    original_text_snapshot: 'When should the garden stay a question?',
    considered_text_snapshot: considered,
  }
}
let garden = structuredClone(ready)
const beforePromotions = originPromotions
for (const row of [
  { id: sharedQuestion, user_id: userA, curiosity_id: curiosityA, original_text: 'When should the garden stay a question?' },
  { id: otherQuestion, user_id: userA, curiosity_id: curiosityA, original_text: 'What else remains open?' },
  { id: soleQuestion, user_id: userA, curiosity_id: curiosityA, original_text: 'Is this question still open?' },
  { id: cleanupQuestion, user_id: userA, curiosity_id: curiosityA, original_text: 'Did the cleanup keep the question?' },
]) {
  const saved = insert(garden, 'questions', row, userA)
  assert.equal(saved.error, null)
  garden = saved.db
}
for (const row of [
  blossomRow(representative, '2026-01-01T00:00:00.000Z', 'First Bloom', sharedQuestion),
  blossomRow(severalSources, '2026-01-15T00:00:00.000Z', 'Many Sources', null),
  blossomRow(februaryEarly, '2026-02-01T00:00:00.000Z', 'Next Bloom', null),
  blossomRow(februaryLate, '2026-02-01T00:00:00.000Z', 'Same Day', null),
  blossomRow(aprilSmallerId, '2026-04-01T00:00:00.000Z', 'Later Bloom', null),
  blossomRow(experienceHistorical, '2020-01-01T00:00:00.000Z', 'Topic Form', null),
  blossomRow(otherOriginConcept, '2020-02-01T00:00:00.000Z', 'Other Bloom', otherQuestion),
  blossomRow(ambiguousConcept, '2020-03-01T00:00:00.000Z', 'Open Reading', null),
  blossomRow(soleConcept, '2026-05-01T00:00:00.000Z', 'Only Bloom', soleQuestion),
  blossomRow(cleanupHistorical, '2026-01-02T00:00:00.000Z', 'Kept Bloom', null),
  blossomRow(cleanupConcept, '2026-08-01T00:00:00.000Z', 'Failed Bloom', cleanupQuestion),
]) {
  const saved = insert(garden, 'concepts', row, userA)
  assert.equal(saved.error, null)
  garden = saved.db
}
const linkRows = [
  blossomLink('71717171-7171-4171-8171-717171717171', representative, sharedQuestion, blossomPrompt),
  blossomLink('7e7e7e7e-7e7e-47e7-87e7-7e7e7e7e7e7e', severalSources, sharedQuestion, blossomPrompt),
  blossomLink('7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f', severalSources, otherQuestion, 'A contributing prompt'),
  blossomLink('72727272-7272-4272-8272-727272727272', februaryEarly, sharedQuestion, blossomPrompt),
  blossomLink('73737373-7373-4373-8373-737373737373', februaryLate, sharedQuestion, blossomPrompt),
  blossomLink('74747474-7474-4474-8474-747474747474', aprilSmallerId, sharedQuestion, blossomPrompt),
  blossomLink('75757575-7575-4575-8575-757575757575', experienceHistorical, sharedQuestion, blossomPrompt),
  blossomLink('76767676-7676-4676-8676-767676767676', otherOriginConcept, sharedQuestion, blossomPrompt),
  blossomLink('77777777-7777-4777-8777-777777777777', ambiguousConcept, sharedQuestion, 'One reading'),
  blossomLink('78787878-7878-4787-8787-787878787878', ambiguousConcept, otherQuestion, 'Another reading'),
  blossomLink('79797979-7979-4797-8797-797979797979', soleConcept, soleQuestion, blossomPrompt),
  blossomLink('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a', cleanupHistorical, cleanupQuestion, blossomPrompt),
  blossomLink('7b7b7b7b-7b7b-47b7-87b7-7b7b7b7b7b7b', cleanupConcept, cleanupQuestion, blossomPrompt),
]
for (const row of linkRows) {
  const saved = insert(garden, 'concept_questions', row, userA)
  assert.equal(saved.error, null)
  garden = saved.db
}
garden.rows.concept_experience_sources = [...(garden.rows.concept_experience_sources ?? []), {
  id: '7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c',
  concept_id: experienceHistorical,
  user_id: userA,
  curiosity_id: curiosityA,
  circle: 'concern',
  original_text_snapshot: 'A topic in concern',
  origin_source_id: '7d7d7d7d-7d7d-47d7-87d7-7d7d7d7d7d7d',
}]
const unchangedIds = [februaryEarly, februaryLate, aprilSmallerId, experienceHistorical, otherOriginConcept, ambiguousConcept, cleanupHistorical]
const beforeRows = new Map(unchangedIds.map((id) => {
  const concept = garden.rows.concepts.find((item) => item.id === id)
  const links = garden.rows.concept_questions.filter((item) => item.concept_id === id)
  return [id, { title: concept?.title, image_path: concept?.image_path, for_considered_text: concept?.for_considered_text, origin_question_id: concept?.origin_question_id ?? null, links: JSON.stringify(links) }]
}))
const manualClear = update(garden, 'concepts', representative, { origin_question_id: null }, userA)
assert.equal(manualClear.error, 'the originating question cannot be cleared')
assert.equal(manualClear.db.rows.concepts.find((item) => item.id === representative)?.origin_question_id, sharedQuestion)
const promoted = remove(garden, 'concepts', representative, userA, 'creation')
assert.equal(promoted.error, null)
assert.equal(promoted.db.rows.concepts.some((item) => item.id === representative), false)
assert.equal(promoted.db.rows.concepts.find((item) => item.id === severalSources)?.origin_question_id, sharedQuestion)
assert.equal(promoted.db.rows.concepts.find((item) => item.id === severalSources)?.title, 'Many Sources')
assert.equal(promoted.db.rows.concepts.find((item) => item.id === experienceHistorical)?.origin_question_id ?? null, null)
assert.equal(promoted.db.rows.concepts.find((item) => item.id === februaryEarly)?.origin_question_id ?? null, null)
assert.equal(promoted.db.rows.concepts.find((item) => item.id === februaryLate)?.origin_question_id ?? null, null)
assert.equal(promoted.db.rows.concepts.find((item) => item.id === aprilSmallerId)?.origin_question_id ?? null, null)
assert.equal(promoted.db.rows.concepts.find((item) => item.id === ambiguousConcept)?.origin_question_id ?? null, null)
assert.equal(promoted.db.rows.concepts.find((item) => item.id === otherOriginConcept)?.origin_question_id, otherQuestion)
const experienceDeleted = remove(promoted.db, 'concepts', experienceHistorical, userA, 'creation')
assert.equal(experienceDeleted.error, null)
assert.equal(experienceDeleted.db.rows.concepts.some((item) => item.id === experienceHistorical), false)
assert.equal(experienceDeleted.db.rows.concepts.find((item) => item.id === severalSources)?.origin_question_id, sharedQuestion)
assert.equal(originPromotions, beforePromotions + 1)
for (const id of [februaryEarly, februaryLate, aprilSmallerId, ambiguousConcept, otherOriginConcept, cleanupHistorical]) {
  const concept = promoted.db.rows.concepts.find((item) => item.id === id)
  const previous = beforeRows.get(id)
  assert.equal(concept?.title, previous?.title)
  assert.equal(concept?.image_path, previous?.image_path)
  assert.equal(concept?.for_considered_text, previous?.for_considered_text)
  assert.equal(JSON.stringify(promoted.db.rows.concept_questions.filter((item) => item.concept_id === id)), previous?.links)
}
const duplicateOrigin = insert(promoted.db, 'concepts', blossomRow('6a6a6a6a-6a6a-46a6-86a6-6a6a6a6a6a6a', '2026-09-01T00:00:00.000Z', 'Second Origin', sharedQuestion), userA)
assert.equal(duplicateOrigin.error, 'unique concepts_one_origin_question')
assert.equal(duplicateOrigin.db.rows.concepts.some((item) => item.id === '6a6a6a6a-6a6a-46a6-86a6-6a6a6a6a6a6a'), false)
assert.equal(originPromotions, beforePromotions + 1)
const released = remove(promoted.db, 'concepts', soleConcept, userA, 'creation')
assert.equal(released.error, null)
assert.equal(released.db.rows.concepts.some((item) => item.origin_question_id === soleQuestion), false)
const reopened = insert(released.db, 'concepts', blossomRow('6b6b6b6b-6b6b-46b6-86b6-6b6b6b6b6b6b', '2026-10-01T00:00:00.000Z', 'Fresh Bloom', soleQuestion), userA)
assert.equal(reopened.error, null)
const questionCleared = remove(promoted.db, 'questions', sharedQuestion, userA, 'creation')
assert.equal(questionCleared.error, null)
assert.equal(questionCleared.db.rows.concepts.find((item) => item.id === severalSources)?.origin_question_id ?? null, null)
assert.equal(questionCleared.db.rows.concepts.find((item) => item.id === februaryEarly)?.origin_question_id ?? null, null)
assert.equal(questionCleared.db.rows.concepts.find((item) => item.id === februaryLate)?.origin_question_id ?? null, null)
assert.equal(questionCleared.db.rows.concepts.some((item) => item.origin_question_id === sharedQuestion), false)
assert.equal(originPromotions, beforePromotions + 1)
const cleaned = remove(promoted.db, 'concepts', cleanupConcept, userA, 'creation')
assert.equal(cleaned.error, null)
assert.equal(cleaned.db.rows.concepts.some((item) => item.id === cleanupConcept), false)
assert.equal(cleaned.db.rows.concepts.find((item) => item.id === cleanupHistorical)?.origin_question_id, cleanupQuestion)
assert.equal(cleaned.db.rows.concepts.find((item) => item.id === cleanupHistorical)?.title, 'Kept Bloom')
const cascadePromotions = originPromotions
const curiosityCascade = remove(promoted.db, 'curiosities', curiosityA, userA, 'creation')
assert.equal(curiosityCascade.error, null)
assert.equal(curiosityCascade.db.rows.concepts.some((item) => item.curiosity_id === curiosityA), false)
assert.equal(curiosityCascade.db.rows.concepts.some((item) => item.id === conceptOtherCuriosity), true)
assert.equal(originPromotions, cascadePromotions)
const accountSeed = insert(structuredClone(promoted.db), 'concepts', {
  ...conceptRow('6c6c6c6c-6c6c-46c6-86c6-6c6c6c6c6c6c', curiosityOther, userB),
  title: 'Other Garden',
}, userB)
assert.equal(accountSeed.error, null)
const accountDb = accountSeed.db
const accountPending: Pending[] = []
removeReferential(accountDb, 'auth.users', { id: userA }, accountPending, 'creation')
assert.equal(accountPending.some((item) => stillReferenced(accountDb, item)), false)
assert.equal(accountDb.rows.concepts.some((item) => item.user_id === userA), false)
assert.equal(accountDb.rows.concepts.some((item) => item.id === '6c6c6c6c-6c6c-46c6-86c6-6c6c6c6c6c6c'), true)
assert.equal(originPromotions, cascadePromotions)

console.log('experience provenance migration checks passed')
console.log('static SQL simulation only; no PostgreSQL database was contacted')
console.log('experience deletion is simulated through the before-delete trigger; PostgreSQL referential-action order was not executed')
console.log('concurrent duplicate saves are an in-memory interleaving; PostgreSQL lock concurrency was not executed')
console.log('parent lock order is read from the SQL text; a PostgreSQL deadlock test was not executed')
console.log('a missing temporary source is rechecked in memory; PostgreSQL did not interleave that wait')
console.log('origin promotion follows the trigger text in memory; PostgreSQL cascade order and lock waiting were not executed')
