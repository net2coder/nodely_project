import { motion } from 'framer-motion';
import { 
  Cpu, Shield, Zap, Cloud, RefreshCw, Users, 
  Lock, Radio, Smartphone, BarChart3, Settings, Globe 
} from 'lucide-react';

const features = [
  {
    icon: Cpu,
    title: 'Hardware-First Truth',
    description: 'UI reflects real device state. What you see is what the device is actually doing.',
  },
  {
    icon: Shield,
    title: 'Zero-Trust Security',
    description: 'Every request authenticated. Role-based access with admin supremacy.',
  },
  {
    icon: Zap,
    title: 'Real-Time Sync',
    description: 'Instant state updates across all connected clients and devices.',
  },
  {
    icon: RefreshCw,
    title: 'OTA Updates',
    description: 'Push firmware updates to your fleet remotely. No physical access needed.',
  },
  {
    icon: Lock,
    title: 'Permanent Identity',
    description: 'Device identity persists across factory resets. Never lose track of hardware.',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'Admins control everything. Customers see only their claimed devices.',
  },
  {
    icon: Cloud,
    title: 'Cloud-Native',
    description: 'Built for scale from day one. Edge functions handle the heavy lifting.',
  },
  {
    icon: Radio,
    title: 'ESP32 Ready',
    description: 'Optimized for ESP32 controllers with AP mode setup and secure communication.',
  },
  {
    icon: Smartphone,
    title: 'Responsive Dashboard',
    description: 'Control your devices from any screen. Mobile-first design.',
  },
  {
    icon: BarChart3,
    title: 'Device Analytics',
    description: 'Track uptime, usage patterns, and performance metrics.',
  },
  {
    icon: Settings,
    title: 'Easy Configuration',
    description: 'WiFi setup via AP mode. No complex provisioning required.',
  },
  {
    icon: Globe,
    title: 'Global Edge Network',
    description: 'Low-latency responses worldwide with edge-deployed functions.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to
            <span className="gradient-text"> Control Hardware</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete platform for IoT device management, built with security and scalability at its core.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
