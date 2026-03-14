const pages = import.meta.glob('../pages/*.jsx', { eager: true });

const ROUTE_META = {
  Home: {
    order: 0,
    path: '/',
    name: 'Home',
    navName: 'Home',
    group: 'home',
    description: 'Choose a learning track and jump into the interactive labs.',
    badge: 'Overview',
  },
  LearnBasics: {
    order: 1,
    path: '/learnbasics',
    name: 'Learn Basics',
    navName: 'Learn Basics',
    group: 'foundation',
    description: 'Learn sign-magnitude, two\'s complement, fixed-point scaling, and width selection.',
    badge: 'Foundation Lab',
  },
  BoothDefault: {
    order: 2,
    path: '/boothdefault',
    name: 'Booth Default',
    navName: 'Booth Default',
    group: 'algorithm',
    description: 'Walk through the standard Booth multiplier with Q[0]Q[-1] decisions, arithmetic shifts, and practice mode.',
    badge: 'Algorithm Lab',
  },
  BoothRadix3: {
    order: 3,
    path: '/boothradix3',
    name: 'Booth Radix-3',
    navName: 'Radix-3',
    group: 'algorithm',
    description: 'Step through modified Booth recoding with the truth table, register updates, and practice mode.',
    badge: 'Algorithm Lab',
  },
  BoothRadix4: {
    order: 4,
    path: '/boothradix4',
    name: 'Booth Radix-4',
    navName: 'Radix-4',
    group: 'algorithm',
    description: 'Work through even-width recoding with +/-2M cases and arithmetic right shifts by 2.',
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
