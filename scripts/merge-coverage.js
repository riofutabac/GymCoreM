#!/usr/bin/env node
// scripts/merge-coverage.js
const fs = require('fs');
const path = require('path');

const coverageDir = path.join(__dirname, '../coverage');
const mergedDir = path.join(coverageDir, 'merged');

// Crear directorio merged si no existe
if (!fs.existsSync(mergedDir)) {
  fs.mkdirSync(mergedDir, { recursive: true });
}

// Servicios a procesar
const services = [
  'auth-service',
  'gym-management-service',
  'inventory-service',
  'payment-service',
  'api-gateway',
  'notification-service',
  'frontend'
];

let totalStatements = 0;
let coveredStatements = 0;
let totalBranches = 0;
let coveredBranches = 0;
let totalFunctions = 0;
let coveredFunctions = 0;
let totalLines = 0;
let coveredLines = 0;

let lcovContent = '';

console.log('🔄 Consolidating coverage reports...');

services.forEach(service => {
  const serviceCoverageDir = path.join(coverageDir, service);
  const lcovFile = path.join(serviceCoverageDir, 'lcov.info');
  
  if (fs.existsSync(lcovFile)) {
    const content = fs.readFileSync(lcovFile, 'utf8');
    lcovContent += content + '\n';
    console.log(`✅ Added coverage from ${service}`);
  } else {
    console.log(`⚠️  No coverage found for ${service}`);
  }
});

// Escribir archivo lcov consolidado
const mergedLcovFile = path.join(mergedDir, 'lcov.info');
fs.writeFileSync(mergedLcovFile, lcovContent);

// Crear también en la raíz para SonarCloud
const rootLcovFile = path.join(__dirname, '../lcov.info');
fs.writeFileSync(rootLcovFile, lcovContent);

console.log('✅ Coverage reports merged successfully!');
console.log(`📄 Merged LCOV file: ${mergedLcovFile}`);
console.log(`📄 Root LCOV file: ${rootLcovFile}`);
