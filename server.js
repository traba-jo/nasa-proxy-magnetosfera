const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Endpoint que tu frontend va a llamar
app.get('/api/omni', async (req, res) => {
  try {
    // 1. Pedir datos a NASA CDAWeb HAPI (usando el dataset de 5 minutos)
    const ahora = new Date();
    const hace6horas = new Date(ahora.getTime() - 6 * 60 * 60 * 1000);
    
    const timeMin = hace6horas.toISOString().split('.')[0] + 'Z';
    const timeMax = ahora.toISOString().split('.')[0] + 'Z';

    const nasaRes = await axios.get('https://cdaweb.gsfc.nasa.gov/hapi/data', {
      params: {
        id: 'OMNI_HRO_5MIN', // <-- Dataset corregido
        time_min: timeMin,
        time_max: timeMax,
        format: 'json'
      }
    });

    // 2. Extraer datos buscando por nombre de parámetro (más robusto)
    const data = nasaRes.data;
    const parametros = data.parameters; // Lista de parámetros disponibles
    const filas = data.data;

    if (!filas || filas.length === 0) {
      return res.json({ bz: 0, speed: 400, density: 5, status: 'Sin datos recientes' });
    }

    // Encontrar los índices de los parámetros que nos interesan
    // Los nombres pueden variar, buscamos coincidencias flexibles
    const idxBz = parametros.findIndex(p => p.name.toLowerCase().includes('bz'));
    const idxSpeed = parametros.findIndex(p => p.name.toLowerCase().includes('v') && !p.name.toLowerCase().includes('vy') && !p.name.toLowerCase().includes('vz')); // Velocidad total (puede ser 'V' o 'sw_v_bulk')
    const idxDensity = parametros.findIndex(p => p.name.toLowerCase().includes('n') || p.name.toLowerCase().includes('density'));

    // Tomar la última fila disponible
    const ultima = filas[filas.length - 1];

    // Extraer valores usando los índices encontrados (si no se encuentra, usar fallback)
    const bz = (idxBz !== -1 && ultima[idxBz] !== undefined) ? ultima[idxBz] : 0;
    const speed = (idxSpeed !== -1 && ultima[idxSpeed] !== undefined) ? ultima[idxSpeed] : 400;
    const density = (idxDensity !== -1 && ultima[idxDensity] !== undefined) ? ultima[idxDensity] : 5;

    const resultado = {
      bz: bz,
      speed: speed,
      density: density,
      status: 'Datos NASA en vivo',
      timestamp: ultima[0] // El primer campo suele ser el tiempo
    };

    res.json(resultado);

  } catch (error) {
    console.error('Error consultando NASA:', error.message);
    // Devolver datos de fallback para que el frontend no se rompa
    res.json({ bz: 0, speed: 400, density: 5, status: 'Error NASA - usando simulación' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy corriendo en puerto ${PORT}`);
});