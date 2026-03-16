import { motion } from 'framer-motion';
import { Wifi, QrCode, Smartphone, Zap } from 'lucide-react';

const steps = [
  {
    icon: Wifi,
    step: '01',
    title: 'Connect Device',
    description: 'Power up your ESP32. Connect to the NODELY-SETUP WiFi network and configure your home WiFi.',
  },
  {
    icon: QrCode,
    step: '02',
    title: 'Claim Your Device',
    description: 'Scan the QR code or visit the claim URL printed in serial. Link the device to your account.',
  },
  {
    icon: Smartphone,
    step: '03',
    title: 'Control Anywhere',
    description: 'Open your dashboard from any device. Toggle relays, monitor status, and manage settings.',
  },
  {
    icon: Zap,
    step: '04',
    title: 'Stay Updated',
    description: 'Receive automatic OTA firmware updates. Your devices always run the latest secure version.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-secondary/30 relative">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Get Started in
            <span className="gradient-text"> Minutes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From unboxing to full control in four simple steps.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-primary/50 to-transparent" />
              )}
              
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto shadow-lg">
                    <step.icon className="w-10 h-10 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
