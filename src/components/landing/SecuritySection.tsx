import { motion } from 'framer-motion';
import { Shield, Lock, Key, Eye, Server, Fingerprint } from 'lucide-react';

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All communication encrypted in transit and at rest.',
  },
  {
    icon: Key,
    title: 'JWT Authentication',
    description: 'Secure token-based auth with automatic refresh.',
  },
  {
    icon: Eye,
    title: 'Row-Level Security',
    description: 'Database policies ensure users only see their data.',
  },
  {
    icon: Server,
    title: 'Edge Validation',
    description: 'All requests validated at the edge before processing.',
  },
  {
    icon: Fingerprint,
    title: 'Device Identity',
    description: 'Hardware-bound UUIDs prevent device impersonation.',
  },
  {
    icon: Shield,
    title: 'Admin Override',
    description: 'Administrators can lock any device instantly.',
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Security at
              <span className="gradient-text"> Every Layer</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Built with a zero-trust architecture. Every request is authenticated, 
              every action is logged, and every device identity is permanent.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {securityFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              
              {/* Security Shield Animation */}
              <div className="relative z-10 text-center">
                <motion.div
                  className="w-32 h-32 mx-auto mb-6 relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30" />
                  <div className="absolute inset-2 rounded-full border-2 border-primary/50" />
                  <div className="absolute inset-4 rounded-full bg-accent flex items-center justify-center">
                    <Shield className="w-12 h-12 text-primary" />
                  </div>
                </motion.div>
                
                <div className="font-mono text-sm space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-muted-foreground">RLS Policies Active</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-muted-foreground">JWT Validation Enabled</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-muted-foreground">Edge Functions Secured</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
