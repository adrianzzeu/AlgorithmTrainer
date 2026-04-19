const pages = import.meta.glob('../pages/*.jsx', { eager: true });

const ROUTE_META = {
  Home: {
    order: 0,
    path: '/',
    name: 'Home',
    navName: 'Home',
    group: 'home',
    description: 'Start here.',
    badge: 'Overview',
  },
  LearnBasics: {
    order: 1,
    path: '/learnbasics',
    name: 'Learn Basics',
    navName: 'Learn Basics',
    group: 'foundation',
    description: 'SM, C2, and fixed-point basics.',
    badge: 'Foundation Lab',
  },
  BoothDefault: {
    order: 2,
    path: '/boothdefault',
    name: 'Booth Default',
    navName: 'Booth Default',
    group: 'algorithm',
    description: 'Regular Booth multiplication.',
    badge: 'Algorithm Lab',
  },
  BoothRadix3: {
    order: 3,
    path: '/boothradix3',
    name: 'Booth Radix-3',
    navName: 'Radix-3',
    group: 'algorithm',
    description: 'Radix-3 Booth with OVR.',
    badge: 'Algorithm Lab',
  },
  BoothRadix4: {
    order: 4,
    path: '/boothradix4',
    name: 'Booth Radix-4',
    navName: 'Radix-4',
    group: 'algorithm',
    description: 'Radix-4 Booth with shifts by 2.',
    badge: 'Algorithm Lab',
  },
  BoothRadix8: {
    order: 5,
    path: '/boothradix8',
    name: 'Booth Radix-8',
    navName: 'Radix-8',
    group: 'algorithm',
    description: 'Radix-8 Booth with shifts by 3.',
    badge: 'Algorithm Lab',
  },
  SRTDivision: {
    order: 6,
    path: '/srtdivision',
    name: 'SRT-2 Division',
    navName: 'SRT-2',
    group: 'algorithm',
    description: 'Unsigned SRT-2 division with normalization and correction.',
    badge: 'Algorithm Lab',
  },
  SRT4Division: {
    order: 7,
    path: '/srt4division',
    name: 'SRT-4 Division',
    navName: 'SRT-4',
    group: 'algorithm',
    description: 'Unsigned SRT-4 division with top6(P) and top4(B) selection.',
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
      description: meta.description ?? 'Study page.',
      badge: meta.badge ?? 'Lab',
      group: meta.group ?? 'page',
      order: meta.order ?? 99,
      Component: pages[path].default,
      fileName,
      isHome: fileName === 'Home',
    };
  })
  .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
