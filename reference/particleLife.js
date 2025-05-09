// Joel Jaffe November 2024
// Based on https://www.youtube.com/watch?v=xiUpAeos168&list=PLZ1w5M-dmhlGWtqzaC2aSLfQFtp0Dz-F_&index=3
// Programming Chaos on YouTube

let numParticles = 500;
let scale;
let K = 0.05;
let friction = 0.3;
let numTypes = 6;  // Adjust this to your desired number of types
let colorStep = 360 / numTypes;
let minDistances = [];
let radii = [];
let forces = [];
let swarm = [];

class Particle {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = createVector(0, 0);
    this.type = int(random(numTypes));
  }
  
  update() {
    let direction = createVector(0, 0);
    let totalForce = createVector(0, 0);
    let acceleration = createVector(0, 0);
    let dis;
    
    for (let p of swarm) {
      if (p !== this) {
        direction.set(p.position);
        direction.sub(this.position);
        
        if (direction.x > 0.5 * width) {
          direction.x -= width;
        }
        if (direction.x < -0.5 * width) {
          direction.x += width;
        }
        if (direction.y > 0.5 * height) {
          direction.y -= height;
        }
        if (direction.y < -0.5 * height) {
          direction.y += height;
        }
        
        dis = direction.mag();
        direction.normalize();
        
        if (dis < minDistances[this.type][p.type]) {
          let force = direction.copy();
          force.mult(abs(forces[this.type][p.type]) * -3);
          force.mult(map(dis, 0, minDistances[this.type][p.type], 1, 0));
          force.mult(K);
          totalForce.add(force);
        }
        
        if (dis < radii[this.type][p.type]) {
          let force = direction.copy();
          force.mult(forces[this.type][p.type]);
          force.mult(map(dis, 0, radii[this.type][p.type], 1, 0));
          force.mult(K);
          totalForce.add(force);
        }
      }
    }
    
    acceleration.add(totalForce);
    this.velocity.add(acceleration);
    this.position.add(this.velocity);
    this.position.x = (this.position.x + width) % width;
    this.position.y = (this.position.y + height) % height;
    this.velocity.mult(friction);
  }
  
  display() {
    fill(this.type * colorStep, 100, 100);
    noStroke();
    circle(this.position.x, this.position.y, 5);
  }
}

function setParameters() {
  // Initialize minDistances, radii, and forces with random values
  for (let i = 0; i < numTypes; i++) {
    minDistances[i] = [];
    radii[i] = [];
    forces[i] = [];
    for (let j = 0; j < numTypes; j++) {
      forces[i][j] = random(scale * 0.003, scale * 0.01); // Adjust range as needed
      if (random(1, 100) < 50) {
        forces[i][j] *= -1;
      }
      minDistances[i][j] = random(scale * 0.05, scale * 0.1); // Adjust range as needed
      radii[i][j] = random(scale * 0.15, scale * 0.5); // Adjust range as needed
    }
  }
}