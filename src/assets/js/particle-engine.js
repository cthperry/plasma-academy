export class ParticleEngine {
  constructor({ width, height, count = 420 }) {
    this.width = width;
    this.height = height;
    this.particles = Array.from({ length: count }, () => this.createParticle());
  }

  createParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      charge: "neutral",
      age: Math.random()
    };
  }

  reset() {
    this.particles = this.particles.map(() => this.createParticle());
  }

  update({ electricField, pressure }) {
    const ionizationChance = Math.min(0.018, Math.max(0, electricField - 30) / 50000);
    const damping = 0.996 - Math.min(0.12, pressure / 1200);
    for (const particle of this.particles) {
      if (particle.charge === "neutral" && Math.random() < ionizationChance) {
        particle.charge = Math.random() > 0.5 ? "electron" : "ion";
        particle.vx += particle.charge === "electron" ? 2.2 : -0.25;
      }
      if (particle.charge === "electron") particle.vx += electricField / 9000;
      if (particle.charge === "ion") particle.vx -= electricField / 48000;
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < 0 || particle.x > this.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.height) particle.vy *= -1;
      particle.x = Math.max(0, Math.min(this.width, particle.x));
      particle.y = Math.max(0, Math.min(this.height, particle.y));
      if (particle.charge !== "neutral" && Math.random() < 0.0007) particle.charge = "neutral";
    }
  }

  stats() {
    const charged = this.particles.filter((particle) => particle.charge !== "neutral").length;
    return {
      total: this.particles.length,
      charged,
      ionization: charged / this.particles.length
    };
  }
}
