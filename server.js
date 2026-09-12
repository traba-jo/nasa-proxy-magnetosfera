const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/omni', async (req, res) => {
  try {
    const ahora = new Date();
    const hace6horas = new Date(ahora.getTime() - 6 * 60 * 60 * 1000);

    const timeMin = hace6horas.toISOString().split('.')[0] + 'Z';
    const timeMax = ahora.toISOString().split('.')[0] + 'Z';

    // ✅ Pedimos TODOS los parámetros (sin el parámetro 'parameters')
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

    // 🔍 Buscar los índices de las columnas que necesitamos por su 'name'
    // En OMNI_HRO_5MIN los nombres son: "Bz_GSM", "flow_speed", "proton_density"
    const encontrarIndice = (nombreBuscado) => {
      return parametros.findIndex(p => p.name && p.name.includes(nombreBuscado));
    };

    const idxBz = encontrarIndice('Bz_GSM');        // Bz en GSM
    const idxSpeed = encontrarIndice('flow_speed'); // Velocidad del viento solar
    const idxDensity = encontrarIndice('proton_density'); // Densidad de protones

    const ultima = filas[filas.length - 1];

    const bz = (idxBz !== -1 && ultima[idxBz] != null) ? ultima[idxBz] : 0;
    const speed = (idxSpeed !== -1 && ultima[idxSpeed] != null) ? ultima[idxSpeed] : 400;
    const density = (idxDensity !== -1 && ultima[idxDensity] != null) ? ultima[idxDensity] : 5;

    res.json({
      bz: bz,
      speed: speed,
      density: density,
      status: 'Datos NASA en vivo',
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