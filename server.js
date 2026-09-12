const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Endpoint que tu frontend va a llamar
app.get('/api/omni', async (req, res) => {
  try {
    // 1. Pedir datos a NASA CDAWeb HAPI (OMNI 1 hora)
    // Nota: usamos los últimos datos disponibles
    const ahora = new Date();
    const hace2horas = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);
    
    const timeMin = hace2horas.toISOString().split('.')[0] + 'Z';
    const timeMax = ahora.toISOString().split('.')[0] + 'Z';

    const nasaRes = await axios.get('https://cdaweb.gsfc.nasa.gov/hapi/data', {
      params: {
        id: 'OMNI2_H0_MRG1HR', // Dataset de OMNI
        time_min: timeMin,
        time_max: timeMax,
        format: 'json'
      }
    });

    // 2. Extraer solo lo que necesitamos
    // El orden de los parámetros en OMNI2_H0_MRG1HR es conocido:
    // [0]=Time, [1]=Bx, [2]=By, [3]=Bz GSE, [4]=Bz GSM, ... [8]=Speed, [9]=Density
    const datos = nasaRes.data.data;
    if (!datos || datos.length === 0) {
      return res.json({ bz: 0, speed: 400, density: 5, status: 'Sin datos recientes' });
    }

    // Tomar la última fila disponible
    const ultima = datos[datos.length - 1];
    
    const resultado = {
      bz: ultima[4] !== undefined ? ultima[4] : 0,        // Bz GSM (nT)
      speed: ultima[8] !== undefined ? ultima[8] : 400,   // Velocidad (km/s)
      density: ultima[9] !== undefined ? ultima[9] : 5,   // Densidad (n/cc)
      status: 'Datos NASA en vivo',
      timestamp: ultima[0]
    };

    res.json(resultado);

  } catch (error) {
    console.error('Error consultando NASA:', error.message);
    // Devolver datos de fallback para que el frontend no se rompa
    res.json({ bz: 0, speed: 400, density: 5, status: 'Error NASA - usando simulación' });
  }
});

// Health check (Render lo usa para saber si el servicio está vivo)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy corriendo en puerto ${PORT}`);
});