require ('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const  cors = require('cors');
const app = express();
const session = require('express-session');
const port = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json());

//Ruta de prueba

app.get('/', (req, res ) => {
    res.send('API de el Kardex funcionando')
});


//Ruta de los usuarios

app.use(session({
    secret : '14092005SAnti',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false}
}));


const usuariosRouter = require('./routes/usuarios');
app.use('/usuarios', usuariosRouter);


// Ruta para los insumos 
const insumosRouter = require('./routes/insumos');
app.use('/insumos', insumosRouter);


// Ruta para el kardex
const kardexRouter = require('./routes/kardex');
app.use('/kardex', kardexRouter);

//Ruta de la auditoria
const auditoriaRouter = require('./routes/auditoria');
app.use ('/auditoria', auditoriaRouter);

//Ruta de sesion activa
app.use(session ({
  secret: 'Ok_proyecto_kardex',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 
  }
}));


// Ruta para nombre_del_insumo
const nombre_del_insumoRouter = require('./routes/nombre_del_insumo')
app.use('/nombre_del_insumo', nombre_del_insumoRouter);

// Rutra para la presentacion

const presentacionRouter = require('./routes/presentacion')
app.use('/presentacion', presentacionRouter);

//Ruta laboratorio

const laboratorioRouter = require('./routes/laboratorio')
app.use('/laboratorio', laboratorioRouter);

//Ruta proveedor

const proveedorRouter = require('./routes/proveedor')
app.use('/proveedor', proveedorRouter);

//Ruta de clasificacion
const clasificacionRouter = require('./routes/clasificacion')
app.use('/clasificacion', clasificacionRouter);

//Ruta de categoria
const categoriaRouter = require('./routes/categoria')
app.use ('/categoria', categoriaRouter);

// Ruta de nombre_insumo del kardex
const nombre_insumoRouter = require('./routes/nombre_insumo')
app.use ('/nombre_insumo', nombre_insumoRouter);

//Ruta de presentacion_k del kardex
const presentacion_kRouter = require('./routes/presentacion_k')
app.use ('/presentacion_k', presentacion_kRouter);

//Ruta de casa_comercial kardex
const casa_comercialRouter = require('./routes/casa_comercial')
app.use ('/casa_comercial', casa_comercialRouter);

//Ruta de proveedor_k del kardex 
const proveedor_kRouter = require('./routes/proveedor_k')
app.use ('/proveedor_k', proveedor_kRouter);

//Ruta de la clasificacion del kardex
const clasificacion_riesgoRouter = require('./routes/clasificacion_riesgo')
app.use ('/clasificacion_riesgo', clasificacion_riesgoRouter);

//Iniciar el servidor 
app.listen(port, () => {
    console.log(`Servidor corriendo en  http://localhost:${port}`)
});

