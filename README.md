# 🏝️ Island Simulation

A 3D tropical island survival simulation built with Three.js, featuring AI agents with complex survival behaviors, resource management, and an ML-ready architecture for training reinforcement learning models.

![Island Simulation](https://img.shields.io/badge/three.js-r160-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-in%20development-yellow)

## 📚 Table of Contents

- [Screenshots](#-screenshots)
- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Getting Started](#-getting-started)
- [Controls & Interface](#-controls--interface)
- [Architecture](#-architecture)
- [ML-Ready API](#-ml-ready-api)
- [Environmental Features](#-environmental-features)
- [Agent Behaviors](#-agent-behaviors)
- [Development](#-development)
- [Feature Tiers & TODO](#-feature-implementation-tiers)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

## 📸 Live Demo

**🌐 [Try it live: island-amber.vercel.app](https://island-amber.vercel.app/)**

Experience the simulation in your browser with:
- Real-time 3D island with dynamic lighting
- Autonomous agents gathering resources and surviving
- Interactive camera controls and debug tools
- Adjustable simulation speed (1x-50x)

> **Screenshots**: Visual gallery coming soon! For now, check out the live demo above.

## 📋 Overview

This is a sophisticated survival simulation where autonomous agents navigate a procedurally generated tropical island. Agents must manage their needs (hunger, energy, health, social), gather resources, craft tools, and work together to survive. The simulation is designed with machine learning in mind, providing a deterministic, API-driven environment perfect for training RL agents.

### Key Features

- **🌴 Procedural Island Generation**: Realistic terrain with beaches, jungles, and diverse flora
- **🤖 Autonomous Agents**: AI-driven tribe members with complex decision-making
- **💧 Survival Systems**: Hunger, energy, health, and social needs that affect agent behavior
- **🎯 Skills & Progression**: XP-based skill system affecting gathering speed, yield, and crafting
- **🔧 Crafting System**: Create tools like fishing spears from gathered materials
- **⏰ Dynamic Time-of-Day**: Realistic lighting cycles from sunrise to sunset
- **🐟 Wildlife**: Fish swimming in surrounding waters
- **🏠 Central Hub**: Shared storage hut for resource management
- **🧠 ML-Ready API**: Deterministic simulation with step-by-step control for training
- **🎨 Beautiful Graphics**: High-quality 3D visuals with shadows, water effects, and dynamic lighting

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/fortun8te/island.git
cd island
npm install

# Run the simulation
npm run dev
```

Visit **http://localhost:5173** to see the island simulation in action!

## 📦 Getting Started

### Prerequisites

- **Node.js 18+** and npm (or yarn/pnpm)
- Modern web browser with WebGL 2.0 support
- Recommended: 8GB+ RAM for optimal performance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/fortun8te/island.git
   cd island
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The simulation will be available at `http://localhost:5173` and should open automatically in your default browser.

### Building for Production

```bash
npm run build
npm run preview
```

### 🚀 Deploying to Vercel

The easiest way to deploy your island simulation:

**Option 1: Vercel CLI (Fastest)**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy from your project directory
vercel

# Follow the prompts, and you're live!
```

**Option 2: Vercel Dashboard (Recommended for continuous deployment)**

1. Push your code to GitHub (already done!)
2. Visit [vercel.com](https://vercel.com)
3. Click "Add New Project"
4. Import your `fortun8te/island` repository
5. Vercel auto-detects Vite settings
6. Click "Deploy"

Your simulation will be live at `https://island-[your-username].vercel.app` in ~30 seconds!

**Auto-deploys**: Every push to your main branch automatically deploys.

## 🎮 Controls & Interface

### 🎥 Camera Controls

| Control | Action |
|---------|--------|
| **WASD** | Move camera forward/back/left/right (free mode) |
| **Q / E** | Move camera up / down |
| **Shift** | Speed boost (2x movement) |
| **Click** | Lock pointer for mouse look (free mode) |
| **Mouse** | Rotate view (orbit mode) / Look around (free mode) |
| **Scroll** | Zoom in/out (orbit mode) |

### 🎛️ GUI Controls

Access all simulation settings via the on-screen panel (top-right):

| Setting | Description | Range |
|---------|-------------|-------|
| **Agent Count** | Number of tribe members | 1-25 |
| **Walk Speed** | Agent movement speed | 0.5-3.0 |
| **Sim Speed** | Time acceleration | 1x-50x |
| **Time of Day** | Lighting cycle control | Auto/Manual |
| **Camera Mode** | Orbit or Free camera | Toggle |
| **Visual Quality** | Graphics fidelity | High/Low |
| **Show Debug** | Display performance stats | On/Off |

### ⌨️ Debug Controls

- **Run Sanity Checks**: Validate agent positions and states
- **Reset Simulation**: Restart with new random seed
- **Export Data**: Save agent statistics (coming soon)

## 🏗️ Architecture

### 📁 Project Structure

```
island/
├── 📄 src/
│   ├── main.js              # 🎬 Main entry point, scene setup, animation loop
│   ├── config.js            # ⚙️ Global configuration and seeded random
│   ├── 📁 systems/          # 🔧 Core simulation systems
│   │   ├── needs.js         #    Survival needs (hunger, energy, health, social)
│   │   ├── skills.js        #    Skill progression and XP system
│   │   ├── resources.js     #    Resource definitions, inventory, crafting
│   │   ├── social.js        #    Social interactions between agents
│   │   └── threats.js       #    Environmental dangers (sharks, storms, etc.)
│   └── 📁 utils/            # 🛠️ Utility functions
│       ├── terrain.js       #    Terrain height generation and positioning
│       └── sanityChecks.js  #    Debug utilities and validation
├── index.html               # 🌐 HTML entry point (includes embedded ML code)
├── package.json             # 📦 Dependencies and scripts
├── vite.config.js          # ⚡ Vite build configuration
└── README.md               # 📖 This file
```

**Key Files:**
- `src/main.js` (2,000+ lines): Scene rendering, agent logic, game loop
- `index.html` (4,900+ lines): UI, styles, and embedded Q-learning ML code
- `src/systems/`: Modular systems for needs, skills, resources, social dynamics

### Core Systems

#### 1. **Needs System** (`systems/needs.js`)

Agents have four core survival needs that decay over time:

- **Hunger**: Decreases faster when moving. Must be satisfied by eating (coconuts, fish)
- **Energy**: Drained by activity, restored by resting. Low energy forces rest
- **Health**: Slowly decays, recovers when well-fed and resting. Affected by sickness
- **Social**: Decays when isolated, recovers near other agents

Agents can die from starvation, exhaustion, drowning, sickness, or old age.

#### 2. **Skills System** (`systems/skills.js`)

Five skill categories that improve through XP:

- **Gathering**: Increases gather speed and yield for resources
- **Fishing**: Improves catch rate and fish size
- **Crafting**: Reduces build time and increases durability
- **Combat**: Increases win chance in conflicts
- **Cooking**: Faster cooking and better nutrition

Skills affect efficiency at their respective tasks, making experienced agents more valuable.

#### 3. **Resource System** (`systems/resources.js`)

Comprehensive resource management:

- **Resources**: Coconuts, wood, stone, vine, fish (multiple types)
- **Inventory**: Slot-based system with stack limits
- **Crafting**: Recipe-based tool creation (e.g., fishing spear = wood + vine)
- **Storage**: Central hut for shared stockpiles
- **Tools**: Equipment that agents can carry and use

#### 4. **Agent Decision Making** (`main.js`)

Agents use a state machine for behavior:

- **States**: `idle`, `walking`, `gathering`, `hauling`, `resting`, `eating`, `crafting`, `fishing`
- **Task Planning**: Agents evaluate their needs and environment to choose actions
- **Priorities**: Hunger → Energy → Resource gathering → Idle

Example decision flow:
1. If very hungry → Find food (coconuts or hut stockpile)
2. If low energy → Rest near hut
3. If carrying resources → Haul to hut
4. If food stockpile low → Gather coconuts
5. Otherwise → Gather building materials (wood/stone)

### Agent Lifecycle

Agents progress through life stages:
- **Baby** (0-2 years): Cannot act, must be cared for
- **Child** (2-12 years): Can act but 50% efficiency
- **Adult** (12-50 years): Full efficiency, can reproduce
- **Elder** (50+ years): 60% efficiency, cannot reproduce

## 🔬 ML-Ready API

The simulation exposes a global API for machine learning integration:

```javascript
window.IslandSimulationAPI = {
    // Get current state of all agents
    getState: () => Array<AgentState>,
    
    // Get environment state (trees, time, etc.)
    getEnvironmentState: () => EnvironmentState,
    
    // Control simulation speed
    setSimulationSpeed: (speed: number) => void,
    
    // Control time of day (0-1, 0=sunrise, 1=sunset)
    setTimeOfDay: (t: number) => void,
    
    // Step simulation forward manually (for ML training)
    step: (n?: number) => void,
    
    // Reset simulation to initial state
    reset: () => void,
    
    // Run validation checks
    runSanityChecks: () => void
}
```

### Agent State Structure

```typescript
interface AgentState {
    id: string;
    position: { x: number, y: number, z: number };
    hunger: number;      // 0-1
    energy: number;      // 0-1
    alive: boolean;
    state: string;       // Current behavior state
    inventory: Inventory;
}
```

### Deterministic Simulation

The simulation uses seeded random generation for reproducibility:
- Configurable seed value in `config.js`
- Fixed timestep updates (20 FPS logic)
- Deterministic terrain generation
- Predictable agent spawns and resource placement

## 🌊 Environmental Features

### Terrain

- Procedurally generated island with varied height
- Beach zones (wet/dry sand)
- Grass transition areas
- Dense jungle interior
- Smooth height transitions with realistic coloring

### Flora

- **Palm Trees**: Spawn coconuts that regenerate over time
- **Jungle Trees**: Provide wood when chopped
- **Bushes**: Decorative vegetation
- **Rocks**: Provide stone resources

### Water

- Realistic water shader with reflections
- Fish swimming in circular patterns
- Shallow reef rings around the island
- Ocean floor below

### Time-of-Day System

Dynamic lighting that changes throughout the day:
- **Sunrise** (0-0.15): Warm orange/pink tones, heavy fog
- **Morning** (0.15-0.3): Golden yellow light
- **Midday** (0.3-0.7): Bright white light, minimal fog
- **Evening** (0.7-0.85): Warm yellow returning
- **Sunset** (0.85-1.0): Dramatic orange/pink, heavy fog

Sun position, sky color, fog density, and water reflections all update automatically.

## 🎯 Agent Behaviors

### Resource Gathering

- **Coconuts**: Climb palm trees, gather from ground, or take from hut
- **Wood**: Chop down trees (palm or jungle)
- **Stone**: Mine rocks scattered around island
- Agents carry resources in visual inventory (coconut mesh on back)

### Crafting

- Agents craft at the central hut using stored materials
- Current recipes: Fishing Spear (wood + vine)
- Crafted tools can be equipped and used

### Social Dynamics

- Agents prefer working near others (social need)
- Can learn skills faster when near skilled agents (apprenticeship)
- Sickness can spread between nearby agents
- Social isolation causes need decay

## 🛠️ Development

### Key Technologies

- **Three.js**: 3D graphics and rendering
- **Vite**: Fast build tool and dev server
- **lil-gui**: Runtime configuration panel

### Configuration

Edit `src/config.js` to adjust:
- Island size and resource counts
- Agent count and movement speed
- Simulation speed and timestep
- Visual quality settings
- Random seed for determinism

### Debugging

The simulation includes comprehensive debug tools:

- **Sanity Checks**: Validates agent positions, state consistency
- **Test Log**: Console output with categorized messages
- **Stats Overlay**: FPS, agent count, deaths, resource availability
- **GUI Controls**: Real-time parameter adjustment

Press the "Run Sanity Checks" button in the GUI to validate simulation state.

## 📊 Performance

- **Target FPS**: 60 FPS rendering, 20 FPS simulation updates
- **Optimizations**: 
  - Capped simulation steps per frame (prevents spiral of death)
  - Quality settings for low-end devices
  - Efficient shadow maps and render settings
  - LOD considerations for large scenes

### Scaling

The simulation can handle:
- 10-25 agents comfortably
- 60+ palm trees, 100+ jungle trees
- High-speed simulation (up to 50x) with frame limiting

## 🎓 Use Cases

### Machine Learning

Perfect for training RL agents on:
- Resource management
- Multi-agent cooperation
- Survival decision-making
- Skill specialization
- Long-term planning

### Education

Great for teaching:
- Agent-based modeling
- Survival game mechanics
- State machines
- Resource economics
- Procedural generation

### Research

Useful for studying:
- Emergent behaviors
- Social dynamics in isolated groups
- Resource scarcity and competition
- Skill specialization in groups
- Life cycle modeling

## 🎯 Feature Implementation Tiers

### ✅ Tier 1: Core Foundation (COMPLETE)
- ✅ Basic island terrain generation
- ✅ Time-of-day lighting system
- ✅ Camera controls (orbit/free)
- ✅ Basic agent models with animations
- ✅ Needs system (hunger, energy, health, social)
- ✅ Skills/XP system framework
- ✅ Resource definitions
- ✅ Central hut storage
- ✅ Basic gathering (coconuts, wood, stone)
- ✅ Simple crafting (fishing spear)
- ✅ ML-ready API structure

### 🚧 Tier 2: Enhanced Behaviors (IN PROGRESS)
- ✅ Basic resource gathering
- ✅ Inventory system
- ⚠️ **Visible resource carrying** - Partial (basic coconut mesh)
- ⚠️ **Multi-resource carrying** - Needs overhaul
- ⚠️ **Tool crafting & usage** - Basic, needs visual improvements
- ⚠️ **Fishing system** - Basic framework, needs complete overhaul
- ⚠️ **Resource sharing/helping** - Needs implementation
- ⚠️ **Optimized decision-making** - Basic, needs efficiency overhaul

### 📋 Tier 3: Advanced Systems (PLANNED)
- ⬜ **Complete animation overhaul** - All actions need proper animations
- ⬜ **Advanced carrying system** - Visual carrying for all resource types
- ⬜ **Full fishing overhaul** - Spearfishing, wading, fish catching
- ⬜ **Water depth system** - Transparent water with depth visualization
- ⬜ **Helping/cooperation behaviors** - Agents help each other
- ⬜ **Fallen coconut pickup** - Ground-level resource gathering
- ⬜ **Punch/harvest animations** - Visual feedback for gathering
- ⬜ **Tool visibility** - Tools visible in hands when equipped

### 🔮 Tier 4: Complex Systems (FUTURE)
- ⬜ Multi-tier fish system (Mullet → Parrotfish → Grouper → Bull Shark → Giant Squid)
- ⬜ Fire system (cooking, warmth, social hub)
- ⬜ Boat system (crafting, durability, deep-water fishing)
- ⬜ Shelter building (individual homes, benefits)
- ⬜ Advanced social system (relationships, alliances, rivalries)
- ⬜ Disease/sickness mechanics
- ⬜ Life cycle (babies, children, reproduction)
- ⬜ Weather system
- ⬜ Combat system
- ⬜ **Audio system & soundtracks** - 4+ tropical soundtracks (2-3 with heavy beats/drums), ambient music, sound effects, environmental audio

## 🔨 Major TODO Items

### Critical Overhauls Needed

#### 1. **Agent AI System Overhaul** 🔴 HIGH PRIORITY
- **Current**: Basic state machine with simple priorities
- **Needed**: Fully optimized decision-making system
  - No random wandering - 100% goal-oriented behavior
  - Efficient pathfinding to resources
  - Dynamic task assignment based on tribe needs
  - Prioritization: Critical needs → Tribe needs → Personal efficiency
  - Collaborative task coordination

#### 2. **Animation System Overhaul** 🔴 HIGH PRIORITY
- **Current**: Basic walking animations
- **Needed**: Complete animation system
  - Gathering animations (punch/harvest for wood, reach for coconuts)
  - Carrying animations (different poses for different resources)
  - Fishing animations (wading, spearing, catching)
  - Crafting animations (working at hut)
  - Eating animations
  - Tool usage animations (spear in hand, using spear)

#### 3. **Resource Carrying Overhaul** 🔴 HIGH PRIORITY
- **Current**: Simple coconut mesh on back
- **Needed**: Full carrying system
  - Visual resources in hands/arms
  - Multi-resource carrying (2-3 coconuts, wood bundles, etc.)
  - Different carrying poses per resource type
  - Mixed resource carrying
  - Dynamic visual updates based on inventory

#### 4. **Fishing System Overhaul** 🟡 MEDIUM PRIORITY
- **Current**: Basic fish swimming, no actual fishing
- **Needed**: Complete fishing mechanics
  - Agents locate fishing spots
  - Wading into shallow water
  - Spearfishing from shore or in water
  - Fish catching mechanics and visual feedback
  - Carrying caught fish back to base
  - Integration with tool system (spear required)

#### 5. **Water System Overhaul** 🟡 MEDIUM PRIORITY
- **Current**: Basic water shader
- **Needed**: Depth-based water system
  - Transparent water with depth visualization
  - Shallow/deep water zones
  - Swimming mechanics for agents
  - Underwater visibility
  - Depth-based fish spawning

#### 6. **Helping/Cooperation System** 🟡 MEDIUM PRIORITY
- **Current**: Basic social need system
- **Needed**: Active helping behaviors
  - Agents identify others in need
  - Bring food/resources to hungry/weak members
  - Prioritize feeding critical cases
  - Resource sharing mechanics
  - Collaborative gathering

#### 7. **Audio & Soundtracks** 🟡 MEDIUM PRIORITY
- **Current**: No audio system
- **Needed**: Complete audio implementation
  - **4+ soundtracks** with tropical/island vibes
  - **2-3 soundtracks with heavy beats/drums** (energetic, rhythmic)
  - Ambient background music (no time-based switching, just variety)
  - Sound effects for actions (gathering, walking, water)
  - Environmental audio (ocean waves, birds, wind)
  - UI sound effects
  - Volume controls
  - Random/mixed playlist system

#### 8. **Resource Collection Improvements** 🟢 LOW PRIORITY
- Pick up fallen coconuts from ground
- Resource combination system (carry mixed types)
- Visual feedback for all gathering actions
- Resource respawn visualization

### Implementation Notes

The simulation is currently in **rule-based mode** with basic efficiency. The goal is to create a **100% optimized society** where agents:
- Never wander randomly
- Always pursue the most efficient actions
- Coordinate tasks to minimize redundancy
- Prioritize critical needs first
- Share resources optimally
- Specialize based on skills

All behaviors should be deterministic and predictable for ML training, while appearing natural and emergent.

## 🐛 Troubleshooting

### Common Issues

**Issue: Simulation runs slowly or lags**
- Solution: Reduce agent count (GUI > Agents)
- Switch to Low quality mode (GUI > Visual Quality)
- Close other browser tabs
- Ensure you're using a modern browser with WebGL 2.0

**Issue: Page doesn't load or shows blank screen**
- Check browser console for errors (F12)
- Ensure Node.js 18+ is installed
- Try clearing browser cache
- Verify dev server is running on port 5173

**Issue: Agents behaving strangely or dying quickly**
- This is expected! The AI is still in development
- Adjust simulation speed to observe behaviors
- Check the TODO list for known behavior issues

**Issue: `npm install` fails**
- Update Node.js to version 18 or higher
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then retry

### Performance Tips

- **Optimal agent count**: 10-15 for smooth performance
- **Simulation speed**: Keep below 10x for accurate physics
- **Graphics**: Use High quality only on powerful GPUs
- **Browser**: Chrome/Edge recommended for best WebGL performance

## ❓ FAQ

**Q: Can I use this for machine learning research?**
A: Yes! The simulation exposes a deterministic API via `window.IslandSimulationAPI` for training RL agents. See the ML-Ready API section.

**Q: How do I change the island terrain?**
A: Edit `src/config.js` and modify the `seed` value for different island layouts.

**Q: Can agents build structures beyond the hut?**
A: Not yet. This is planned for Tier 4 (shelter building system).

**Q: Is multiplayer supported?**
A: No, this is a single-player simulation focused on AI agent behavior.

**Q: Can I export simulation data?**
A: The Q-learning data is saved to localStorage. Full CSV export is planned.

## 🤝 Contributing

Contributions are welcome! Here's how to help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and test thoroughly
4. **Commit** (`git commit -m 'Add amazing feature'`)
5. **Push** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Priorities

See the **TODO Items** section for current priorities. High-priority areas:
- Agent AI optimization
- Animation system overhaul
- Fishing mechanics
- Resource carrying visuals

### Code Style

- Use ES6+ JavaScript
- Follow existing code structure
- Comment complex logic
- Test with multiple agent counts (1, 5, 15, 25)

## 📝 License

MIT License - feel free to use this project for learning, research, or commercial purposes.

## 🙏 Acknowledgments

Built with:
- [Three.js](https://threejs.org/) - 3D graphics library
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [lil-gui](https://lil-gui.georgealways.com/) - Lightweight GUI controls
- Inspired by survival games and agent-based modeling research

## 🔗 Links

- **Repository**: [github.com/fortun8te/island](https://github.com/fortun8te/island)
- **Issues**: [Report bugs or request features](https://github.com/fortun8te/island/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/fortun8te/island/discussions)

---

**Enjoy exploring the island! 🏝️**

*Built with ❤️ for AI research, education, and fun*

