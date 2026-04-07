// Navigation items for OrbitNav
export const navigationItems = [
  { label: 'Home', href: '/' },
  { label: 'Why Solar', href: '/why-solar/' },
  { label: 'Why Us', href: '/why-work-with-us/' },
  { label: 'Clients', href: '/clients/' },
  { label: 'Projects', href: '/projets/' },
  { label: 'Contact', href: '/contact/' },
];

// Route to label mapping for OrbitNav display text
export const routeLabels: Record<string, string> = {
  '/': 'accueil',
  '/why-solar/': 'solaire',
  '/why-work-with-us/': 'nous',
  '/clients/': 'clients',
  '/projets/': 'projets',
  '/contact/': 'contact',
};


