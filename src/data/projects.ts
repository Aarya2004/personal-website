export interface Project {
  title: string;
  description: string;
  tags: string[];
  url?: string;
  repo?: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    title: 'Street Fighter AI',
    description:
      'Reinforcement learning model that learns to play Street Fighter on Game Boy Color.',
    tags: ['Python', 'Reinforcement Learning'],
    repo: 'https://github.com/Aarya2004/street-fighter-ai',
    featured: true,
  },
  {
    title: 'Pneumonia Detection Model',
    description: 'ML model for detecting pneumonia from chest X-rays using deep learning.',
    tags: ['Python', 'ML', 'Jupyter'],
    repo: 'https://github.com/Aarya2004/pneumonia-detection',
    featured: true,
  },
  {
    title: 'GroveReservations',
    description: 'Reservation management system built in Go (in progress).',
    tags: ['Go'],
    repo: 'https://github.com/Aarya2004/GroveReservations',
    featured: true,
  },
  {
    title: 'CSM Job Viewer',
    description: 'Job listing viewer/scraper.',
    tags: ['Python'],
    repo: 'https://github.com/Aarya2004/csm-job-viewer',
  },
  {
    title: 'UTASR Website',
    description: 'Club website for UofT organization.',
    tags: ['TypeScript', 'Angular'],
    repo: 'https://github.com/Aarya2004/utasr-website',
  },
  {
    title: 'Personal Website',
    description: 'This portfolio site built with Astro and Tailwind CSS.',
    tags: ['Astro', 'Tailwind CSS'],
    repo: 'https://github.com/Aarya2004/personal-website',
  },
  {
    title: 'AOC 2024',
    description: 'Advent of Code 2024 solutions.',
    tags: ['Python'],
    repo: 'https://github.com/Aarya2004/aoc-2024',
  },
  {
    title: 'AOC 2025',
    description: 'Advent of Code 2025 solutions.',
    tags: ['C++'],
    repo: 'https://github.com/Aarya2004/aoc-2025',
  },
];
