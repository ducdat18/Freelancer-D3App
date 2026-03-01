export const JOB_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Graphic Design',
  'Content Writing',
  'Marketing',
  'Data Science',
  'Blockchain',
  'Video & Animation',
  'Other'
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];

export const CATEGORY_SKILLS: Record<JobCategory, string[]> = {
  'Web Development': [
    'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript',
    'Node.js', 'Express', 'NestJS', 'HTML', 'CSS', 'Tailwind CSS',
    'PHP', 'Laravel', 'Django', 'Flask', 'Ruby on Rails', 'ASP.NET',
    'GraphQL', 'REST API', 'WebSocket', 'PostgreSQL', 'MongoDB', 'MySQL'
  ],
  'Mobile Development': [
    'React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android',
    'Ionic', 'Xamarin', 'Firebase', 'Mobile UI/UX', 'App Store Optimization',
    'Push Notifications', 'In-App Purchases', 'Mobile Testing'
  ],
  'UI/UX Design': [
    'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Prototyping',
    'Wireframing', 'User Research', 'Usability Testing', 'Design Systems',
    'Responsive Design', 'Mobile Design', 'Web Design', 'Interaction Design'
  ],
  'Graphic Design': [
    'Adobe Photoshop', 'Adobe Illustrator', 'CorelDRAW', 'Canva',
    'Logo Design', 'Brand Identity', 'Print Design', 'Packaging Design',
    'Typography', 'Color Theory', 'Illustration', '3D Design', 'Infographics'
  ],
  'Content Writing': [
    'Blog Writing', 'Copywriting', 'Technical Writing', 'SEO Writing',
    'Creative Writing', 'Proofreading', 'Editing', 'Content Strategy',
    'Social Media Copy', 'Email Marketing', 'Product Descriptions',
    'Press Releases', 'Ghost Writing'
  ],
  'Marketing': [
    'Digital Marketing', 'SEO', 'SEM', 'Social Media Marketing',
    'Email Marketing', 'Content Marketing', 'Influencer Marketing',
    'Marketing Strategy', 'Google Ads', 'Facebook Ads', 'Analytics',
    'Growth Hacking', 'Conversion Optimization', 'Brand Marketing'
  ],
  'Data Science': [
    'Python', 'R', 'Machine Learning', 'Deep Learning', 'TensorFlow',
    'PyTorch', 'Data Analysis', 'Data Visualization', 'SQL', 'pandas',
    'NumPy', 'Scikit-learn', 'Statistics', 'Big Data', 'Data Mining'
  ],
  'Blockchain': [
    'Solana', 'Ethereum', 'Smart Contracts', 'Solidity', 'Rust', 'Anchor',
    'Web3.js', 'ethers.js', 'DeFi', 'NFTs', 'DAO', 'Cryptocurrency',
    'Blockchain Security', 'Token Development', 'dApp Development'
  ],
  'Video & Animation': [
    'Video Editing', 'After Effects', 'Premiere Pro', 'Final Cut Pro',
    'Motion Graphics', '2D Animation', '3D Animation', 'Blender',
    'Cinema 4D', 'Color Grading', 'Sound Design', 'VFX', 'Explainer Videos'
  ],
  'Other': [
    'Virtual Assistant', 'Customer Support', 'Data Entry', 'Transcription',
    'Translation', 'Project Management', 'Business Analysis', 'QA Testing',
    'DevOps', 'Cybersecurity', 'Game Development', 'AI/ML', 'Cloud Computing'
  ]
};

// Get all unique skills across all categories
export const ALL_SKILLS = Array.from(
  new Set(Object.values(CATEGORY_SKILLS).flat())
).sort();

// Get skills for a specific category
export const getSkillsByCategory = (category: JobCategory): string[] => {
  return CATEGORY_SKILLS[category] || [];
};

// Find category for a given skill
export const getCategoryForSkill = (skill: string): JobCategory | null => {
  for (const [category, skills] of Object.entries(CATEGORY_SKILLS)) {
    if (skills.includes(skill)) {
      return category as JobCategory;
    }
  }
  return null;
};

// Get popular skills (top 20 most commonly used)
export const POPULAR_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
  'Figma', 'Adobe Photoshop', 'SEO', 'Content Writing', 'UI/UX Design',
  'Solana', 'Ethereum', 'Smart Contracts', 'Mobile Development', 'Flutter',
  'Video Editing', 'GraphQL', 'PostgreSQL', 'AWS', 'Docker'
];
