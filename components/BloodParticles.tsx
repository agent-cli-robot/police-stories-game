'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}

interface BloodParticlesProps {
  particles: Particle[];
  cameraX: number;
  cameraY: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const BloodParticles = ({ 
  particles, 
  cameraX, 
  cameraY,
  canvasWidth = 800,
  canvasHeight = 600
}: BloodParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw particles
    particles.forEach(particle => {
      if (particle.life > 0) {
        // Draw blood droplet
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life;
        ctx.beginPath();
        ctx.arc(
          particle.x - cameraX, 
          particle.y - cameraY, 
          particle.size, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
      }
    });

    // Reset global alpha
    ctx.globalAlpha = 1;
  }, [particles, cameraX, cameraY, canvasWidth, canvasHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};

// Function to create blood particles at enemy position
export const createBloodParticles = (x: number, y: number, count: number = 8): Particle[] => {
  const particles: Particle[] = [];
  
  for (let i = 0; i < count; i++) {
    // Random angle for particle dispersion
    const angle = Math.random() * Math.PI * 2;
    // Random velocity
    const speed = Math.random() * 3 + 1; // 1-4 speed
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Random size
    const size = Math.random() * 3 + 1; // 1-4 size
    
    // Random color variations (dark red to bright red)
    const redVariations = [
      '#dc2626', // bright red
      '#b91c1c', // darker red
      '#991b1b', // deep red
      '#7f1d1d', // dark red
      '#5e1717', // very dark red
    ];
    const color = redVariations[Math.floor(Math.random() * redVariations.length)];
    
    particles.push({
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      life: 1, // Fully visible initially
      decay: Math.random() * 0.02 + 0.005, // Fade out over time
      size: size,
      color: color,
    });
  }
  
  return particles;
};

// Function to update particles each frame
export const updateBloodParticles = (particles: Particle[]): Particle[] => {
  return particles
    .map(particle => {
      // Update position
      const newX = particle.x + particle.vx;
      const newY = particle.y + particle.vy;
      
      // Apply gravity effect (slight downward pull)
      const newVy = particle.vy + 0.1;
      
      // Update life
      const newLife = particle.life - particle.decay;
      
      // Update velocity (slow down over time)
      const newVx = particle.vx * 0.98; // Air resistance
      
      return {
        ...particle,
        x: newX,
        y: newY,
        vy: newVy,
        vx: newVx,
        life: newLife,
      };
    })
    .filter(particle => particle.life > 0); // Remove dead particles
};