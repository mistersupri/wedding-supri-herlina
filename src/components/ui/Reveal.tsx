import React from 'react';
import { motion } from 'motion/react';

/** Rises 12px into place once when scrolled into view (DESIGN.md, Motion). */
export const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number; as?: 'div' | 'li' }> = ({
  children,
  className,
  delay = 0,
  as = 'div',
}) => {
  const Tag = as === 'li' ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
};
