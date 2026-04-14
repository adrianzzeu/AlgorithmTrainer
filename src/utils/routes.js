const pages = import.meta.glob('../pages/*.jsx', { eager: true });

const ROUTE_META = {
  Home: {
    order: 0,
    path: '/',
    name: 'Home',
    navName: 'Home',
    group: 'home',
    description: 'Overview and entry point.',
    badge: 'Overview',
  },
  LearnBasics: {
    order: 1,
    path: '/learnbasics',
    name: 'Learn Basics',
    navName: 'Learn Basics',
    group: 'foundation',
    description: 'Sign-magnitude, two\'s complement, and fixed-point basics.',
    badge: 'Foundation Lab',
  },
  BoothDefault: {
    order: 2,
    path: '/boothdefault',
    name: 'Booth Default',
    navName: 'Booth Default',
    group: 'algorithm',
    description: 'Standard Booth flow with the live table and practice mode.',
    badge: 'Algorithm Lab',
  },
  BoothRadix3: {
    order: 3,
    path: '/boothradix3',
    name: 'Booth Radix-3',
    navName: 'Radix-3',
    group: 'algorithm',
    description: 'Modified Booth recoding with the same table-first workflow.',
    badge: 'Algorithm Lab',
  },
  BoothRadix4: {
    order: 4,
    path: '/boothradix4',
    name: 'Booth Radix-4',
    navName: 'Radix-4',
    group: 'algorithm',
    description: 'Radix-4 recoding with +/-2M cases and shifts by 2.',
    badge: 'Algorithm Lab',
  },
};

function formatName(name) {
  return name.replace(/([A-Z])/g, ' $1').trim();
}

export const dynamicRoutes = Object.keys(pages)
  .map((path) => {
    const fileName = path.match(/\/([^/]+)\.jsx$/)[1];
    const meta = ROUTE_META[fileName] ?? {};

    return {
      path: meta.path ?? `/${fileName.toLowerCase()}`,
      name: meta.name ?? formatName(fileName),
      navName: meta.navName ?? meta.name ?? formatName(fileName),
      description: meta.description ?? 'Interactive study page.',
      badge: meta.badge ?? 'Lab',
      group: meta.group ?? 'page',
      order: meta.order ?? 99,
      Component: pages[path].default,
      fileName,
      isHome: fileName === 'Home',
    };
  })
  .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
