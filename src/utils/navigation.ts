// Navigation items for OrbitNav
export const navigationItems = [
  { label: 'Home', href: '/' },
  { label: 'Why Solar', href: '/why-solar/' },
  { label: 'Why Us', href: '/why-work-with-us/' },
  { label: 'Clients', href: '/clients/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Contact', href: '/contact/' },
];

// Route to label mapping for OrbitNav display text
export const routeLabels: Record<string, string> = {
  '/': 'accueil',
  '/why-solar/': 'solaire',
  '/why-work-with-us/': 'nous',
  '/clients/': 'clients',
  '/projects/': 'projets',
  '/contact/': 'contact',
};


