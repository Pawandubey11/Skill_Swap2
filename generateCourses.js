import fs from 'fs';

const categories = ['tech', 'design', 'music', 'language', 'cooking', 'fitness'];
const authors = ['user1', 'user2', 'user3', 'user4', 'user5'];
const authorNames = ['Alex Moreno', 'Sarah Chen', 'David Kim', 'Emma Watson', 'Chris Evans'];

const markdownTemplate = (topic, tech1, tech2) => `
# The Complete Guide to ${topic}

Welcome to the definitive, multi-chapter documentation for mastering ${topic}. This course spans over 100 pages of deeply researched material, exercises, and architectural patterns.

## Chapter 1: Introduction to ${topic}

${topic} has revolutionized the way we approach modern problems. By leveraging tools like ${tech1} and ${tech2}, you can build scalable, performant, and beautiful solutions.

### Why this matters?

![Hero Image](https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)

1. **Performance**: Speed is a feature.
2. **Scalability**: Grow from 1 to 1,000,000 users.
3. **Maintainability**: Write code that your future self will thank you for.

## Chapter 2: Architectural Patterns

Below is a Mermaid diagram illustrating a typical system architecture for ${topic}.

\`\`\`mermaid
graph TD
    A[Client] -->|HTTP Request| B(API Gateway)
    B --> C{Load Balancer}
    C -->|Route 1| D[Service A]
    C -->|Route 2| E[Service B]
    D --> F[(Database)]
    E --> F
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#f66,stroke-width:2px,stroke-dasharray: 5 5
\`\`\`

## Chapter 3: Video Deep Dive

Watch the following video for a comprehensive deep dive into the core concepts:

*(Video loaded in the sidebar/header)*

## Chapter 4: Practical Implementation

Let's look at some advanced implementation details.

\`\`\`typescript
interface Config {
  apiKey: string;
  endpoint: string;
  timeoutMs: number;
}

class ServiceProvider {
  constructor(private config: Config) {}
  
  async execute() {
    console.log("Initializing ${topic} service...");
    // Complex business logic here
  }
}
\`\`\`

### Summary
This concludes the introductory module of the 100-page ${topic} curriculum. In the following modules, we will dive into advanced caching, real-time analytics, and deployment strategies.
`;

const videoIds = [
  '8hly31xKli0', // Algorithms
  'Ke90Tje7VS0', // React
  'rfscVS0vtbw', // Python
  'W6NZfCO5SIk', // JS
  'cyaLioe0Gik', // UI UX
  'mGpfKkK_zO8', // Fitness
  'y8eD4tLd_O8', // Cooking
  'sVbEyFZKgqk', // Language
  'v8kFT4I31es', // Guitar
  '7v_YkC611U4', // Piano
];

const courseTitles = [
  ["Mastering Advanced React Patterns", "tech", "React", "Next.js"],
  ["Full-Stack Python & Django", "tech", "Python", "Django"],
  ["UI/UX Design Systems 101", "design", "Figma", "Design Tokens"],
  ["Classical Piano for Beginners", "music", "Sheet Music", "Posture"],
  ["French Immersion: Zero to Fluency", "language", "Grammar", "Conversation"],
  ["Gourmet Cooking at Home", "cooking", "Knife Skills", "Flavor Profiles"],
  ["High-Intensity Interval Training (HIIT)", "fitness", "Cardio", "Strength"],
  ["Modern C++ for Game Development", "tech", "C++20", "Unreal Engine"],
  ["Advanced Typography Rules", "design", "Kerning", "Web Fonts"],
  ["Acoustic Guitar Mastery", "music", "Chords", "Fingerpicking"],
  ["Japanese Kanji Demystified", "language", "Radicals", "Mnemonics"],
  ["Vegan Baking Secrets", "cooking", "Substitutes", "Chemistry"],
  ["Yoga for Flexibility & Mindfulness", "fitness", "Asanas", "Breathwork"],
  ["Data Science with Pandas & NumPy", "tech", "Python", "Data Viz"],
  ["3D Modeling with Blender", "design", "Meshes", "Rendering"]
];

const courses = courseTitles.map((c, i) => {
  const authorIdx = i % authors.length;
  const vid = videoIds[i % videoIds.length];
  
  return {
    id: `course-${i + 1}`,
    authorId: authors[authorIdx],
    authorName: authorNames[authorIdx],
    name: authorNames[authorIdx],
    offer: c[0],
    category: c[1],
    want: c[1] === 'tech' ? 'Design' : 'Tech',
    bio: `I am a passionate instructor eager to share my knowledge on ${c[0]}.`,
    createdAt: Date.now() - Math.floor(Math.random() * 10000000000),
    documentation: markdownTemplate(c[0], c[2], c[3]),
    youtubeId: vid
  };
});

// Ensure data dir exists
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

fs.writeFileSync('./data/courses.json', JSON.stringify(courses, null, 2));
console.log('Successfully generated 15 courses into data/courses.json');
