const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/omni', async (req, res) => {
  try {
    // ⚠️ OMNI_HRO_5MIN solo tiene datos hasta 2026-08-31
    // Usamos las últimas 48 horas disponibles
    const timeMin = '2026-08-30T00:00:00Z';
    const timeMax = '2026-08-31T23:55:00Z';

    const nasaRes = await axios.get('https://cdaweb.gsfc.nasa.gov/hapi/data', {
      params: {
        id: 'OMNI_HRO_5MIN',
        time_min: timeMin,
        time_max: timeMax,
        format: 'json'
      }
    });

    const data = nasaRes.data;
    const parametros = data.parameters;
    const filas = data.data;

    if (!filas || filas.length === 0) {
      return res.json({ bz: 0, speed: 400, density: 5, status: 'Sin datos recientes' });
    }

    // Encontrar índices por nombre exacto (según la respuesta de /info)
    const idxBz = parametros.findIndex(p => p.name === 'BZ_GSM');
    const idxSpeed = parametros.findIndex(p => p.name === 'flow_speed');
    const idxDensity = parametros.findIndex(p => p.name === 'proton_density');

    // Tomar la última fila
    const ultima = filas[filas.length - 1];

    const bz = (idxBz !== -1 && ultima[idxBz] != null) ? ultima[idxBz] : 0;
    const speed = (idxSpeed !== -1 && ultima[idxSpeed] != null) ? ultima[idxSpeed] : 400;
    const density = (idxDensity !== -1 && ultima[idxDensity] != null) ? ultima[idxDensity] : 5;

    res.json({
      bz: bz,
      speed: speed,
      density: density,
      status: 'Datos NASA (OMNI, agosto 2026)',
      timestamp: ultima[0]
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