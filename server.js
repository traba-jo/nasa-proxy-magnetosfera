const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/omni', async (req, res) => {
  try {
    // Rango válido para OMNI_HRO_5MIN (datos hasta 2026-08-31)
    const timeMin = '2026-08-18T00:00:00Z';
    const timeMax = '2026-08-18T23:55:00Z'; // Usamos el último día con datos definitivos

    const nasaRes = await axios.get('https://cdaweb.gsfc.nasa.gov/hapi/data', {
      params: {
        id: 'OMNI_HRO_5MIN',
        'time.min': timeMin,
        'time.max': timeMax,
        format: 'json'
      }
    });

    const data = nasaRes.data;
    const parametros = data.parameters;
    const filas = data.data;

    if (!filas || filas.length === 0) {
      return res.json({ bz: 0, speed: 400, density: 5, status: 'Sin datos recientes' });
    }

    const idxBz = parametros.findIndex(p => p.name === 'BZ_GSM');
    const idxSpeed = parametros.findIndex(p => p.name === 'flow_speed');
    const idxDensity = parametros.findIndex(p => p.name === 'proton_density');

    // Valores "fill" (relleno) que significan "sin dato"
    const FILL_BZ = 9999.99;
    const FILL_SPEED = 99999.9;
    const FILL_DENSITY = 999.99;

    // Buscar hacia atrás la última fila con datos VÁLIDOS
    let bz = 0, speed = 400, density = 5, timestamp = null;

    for (let i = filas.length - 1; i >= 0; i--) {
      const fila = filas[i];
      const bzVal = fila[idxBz];
      const speedVal = fila[idxSpeed];
      const densityVal = fila[idxDensity];

      // Solo aceptamos valores que no sean fill ni null
      if (bzVal !== FILL_BZ && bzVal != null && 
          speedVal !== FILL_SPEED && speedVal != null &&
          densityVal !== FILL_DENSITY && densityVal != null) {
        bz = bzVal;
        speed = speedVal;
        density = densityVal;
        timestamp = fila[0];
        break;
      }
    }

    res.json({
      bz: bz,
      speed: speed,
      density: density,
      status: 'Datos NASA (OMNI, agosto 2026)',
      timestamp: timestamp || 'Sin datos válidos'
    });

  } catch (error) {
    console.error('Error consultando NASA:', error.message);
    res.json({ bz: 0, speed: 400, density: 5, status: 'Error NASA - usando simulación' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy corriendo en puerto ${PORT}`);
});