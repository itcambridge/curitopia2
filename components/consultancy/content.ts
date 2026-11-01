export const consultantName = 'Mark Austin'
export const consultantTitle = 'Independent IT Infrastructure Architect & Technical Lead'
export const contactEmail = 'mark.austin@curitopia.com'

export const services = [
  {
    title: 'Infrastructure Architecture',
    points: [
      'Enterprise infrastructure design',
      'Hybrid cloud architecture',
      'Windows Server, Linux and virtualisation',
      'Infrastructure strategy and technical roadmaps',
    ],
  },
  {
    title: 'Migration & Transformation',
    points: [
      'Server and application migrations',
      'Domain and Active Directory migrations',
      'File services and DFS migrations',
      'Enterprise infrastructure modernisation',
      'Migration planning, risk management and cutover',
    ],
  },
  {
    title: 'Workplace & End User Computing',
    points: [
      'Citrix and virtual desktop infrastructure',
      'Hyper-V and VMware',
      'Application delivery',
      'Enterprise device and workplace transformation',
      'Specialist and regulated laboratory environments',
    ],
  },
  {
    title: 'Identity & Security',
    points: [
      'Active Directory and Entra ID',
      'Identity and privileged access management',
      'Group Policy and access control',
      'MFA, RBAC and Zero Trust principles',
      'Infrastructure hardening and security remediation',
    ],
  },
  {
    title: 'AI & Modern Infrastructure',
    points: [
      'AI application infrastructure',
      'Linux and Docker deployments',
      'RAG and vector database infrastructure',
      'API services and containerised applications',
      'AI-assisted software development and automation',
    ],
  },
] as const

export const results = [
  {
    figure: '250',
    unit: 'servers',
    text: 'Led an infrastructure migration and upgrade programme from VMware to AWS for Cambridgeshire and Peterborough Council.',
    href: '#migration',
    link: 'View the project',
  },
  {
    figure: '99%',
    unit: 'seamless migrations',
    text: 'Delivered a 99% seamless migration record across a large and varied server estate.',
    href: '#migration',
    link: 'View the project',
  },
  {
    figure: '500%',
    unit: 'performance improvement',
    text: 'Improved application response time by 500% through infrastructure diagnosis and optimisation on a Cambs/Beds Fire project.',
    href: '#work',
    link: 'View selected work',
  },
  {
    figure: '3',
    unit: 'Citrix farms rebuilt',
    text: 'Rebuilt three Citrix farms following a multi-site disaster at a pharmaceutical organisation, helping restore departmental services within two days.',
    href: '#recovery',
    link: 'View the project',
  },
] as const

export const projects = [
  {
    id: 'migration',
    title: 'Enterprise Infrastructure Migration — Local Government',
    summary: 'Led infrastructure delivery for a programme covering approximately 250 servers, migrating infrastructure from VMware to AWS.',
    points: [
      'Migration planning and architecture',
      'Core Microsoft infrastructure services',
      'Domain controller and file server migrations',
      'Coordination of engineers, application owners and suppliers',
      '99% seamless migration record',
    ],
  },
  {
    id: 'pharmaceutical',
    title: 'Regulated Pharmaceutical Infrastructure',
    summary: 'Technical leadership across secure VDI and application infrastructure in regulated pharmaceutical environments.',
    points: [
      'Citrix, VMware, Nutanix and NetScaler',
      'Okta MFA integration',
      'Business-critical application delivery',
      'Controlled change within regulated laboratory environments',
    ],
  },
  {
    id: 'recovery',
    title: 'Infrastructure Recovery & Citrix Transformation',
    summary: 'Rebuilt three Citrix farms following a multi-site disaster.',
    points: [
      'Infrastructure recovery and restoration',
      'Citrix farm rebuilds',
      'NetScaler high availability',
      'Application and user migration',
      'Restoration of departmental services within two days',
    ],
  },
  {
    id: 'workplace',
    title: 'Current Workplace Transformation Engagement',
    summary:
      'Currently working as an Infrastructure Lead / Technical Architect on an enterprise device migration and workplace transformation programme within a regulated pharmaceutical GMP environment.',
    points: [
      'Architecture responsibilities span infrastructure, end-user computing, identity, network and security',
      'Specialist laboratory PCs connected to scientific equipment',
    ],
  },
] as const

export const stages = [
  { title: 'Understand', text: 'Establish the business requirements, technical environment and constraints.' },
  { title: 'Assess', text: 'Identify dependencies, risks, gaps and opportunities.' },
  { title: 'Design', text: 'Produce practical architecture and migration designs.' },
  { title: 'Deliver', text: 'Coordinate implementation, testing and controlled change.' },
  { title: 'Support', text: 'Ensure a stable transition and clear operational handover.' },
] as const

export const qualifications = [
  'BEng (Hons), Engineering, Science & Technology — Brunel University',
  'HNC Electrical and Electronic Engineering',
  'Generative AI in Business — University of Cambridge',
  'PRINCE2 Foundation',
  'VMware training',
  'Kubernetes CKA training',
  'Microsoft and Citrix legacy certifications',
] as const

export const navigation = [
  { href: '#services', label: 'Services' },
  { href: '#results', label: 'Results' },
  { href: '#work', label: 'Work' },
  { href: '#approach', label: 'Approach' },
  { href: '#about', label: 'About' },
  { href: '#curitopia', label: 'Curitopia' },
  { href: '#contact', label: 'Contact' },
] as const
