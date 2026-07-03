const fs = require('fs');
const express = require('express');
const mysql = require('mysql2');

const server = express();
server.use(express.urlencoded({extended:true}))
server.use(express.static('public'));

server.use(express.urlencoded({ extended: true }));


server.use(express.static('public')); 


const conexion = mysql.createConnection({
    host: '10.1.15.29',
    user: 'alumno',
    password: 'alumno',
    database: 'MiBaseCarlos'
});


const cabecera = fs.readFileSync('html/header.html', 'utf8');
const final = fs.readFileSync('html/footer.html', 'utf8');

//insert
server.get("/personajes", (req, res) => {    
    conexion.query("SELECT * FROM personajes_lotr", (error, data) => {
        let fila = ``;
        let poderTotal = 0;
        let cantidadPersonajes = 0;

        if (error) {
            console.log(error);
            fila = `<tr><td colspan="6">ERROR AL CARGAR LOS DATOS DESDE MYSQL</td></tr>`;
        } else if (data.length === 0) {
            fila = `<tr><td colspan="6">NO HAY PERSONAJES REGISTRADOS EN LA TIERRA MEDIA</td></tr>`;             
        } else {
            cantidadPersonajes = data.length;
            for (const item of data) {
                poderTotal += item.nivel_poder; 

                fila += `
                    <tr>
                        <td>${item.id}</td>
                        <td><b>${item.nombre}</b></td>
                        <td>${item.raza}</td>
                        <td>${item.arma}</td>
                        <td>${item.nivel_poder} pts</td>
                        <td>
                            <a href="/editar_personaje?id=${item.id}" class="btn-editar">Editar</a> | 
                            <a href="/eliminar_personaje?id=${item.id}" class="btn-eliminar" onclick="return confirmarEliminacion()">Eliminar</a>
                        </td>        
                    </tr>                    
                `;
            }
        }

        let bonusAlianza = 0;
        if (cantidadPersonajes >= 4) {
            bonusAlianza = Math.round(poderTotal * 0.15); // 15% de bonus por ejército grande
        }
        
        const poderFinal = poderTotal + bonusAlianza;

        const contenido = `
            <center>
                <h2>Panel de Reclutamiento</h2>
                
                <div class="box-formulario" style="width: 700px;">
                    <h3>+ Reclutar Nuevo Personaje</h3>
                    <form action="/ingresar_personaje" method="POST">
                        <table class="form-table">
                            <tr>
                                <td width="30%">Nombre:</td>
                                <td><input type="text" name="nombre" required placeholder="Ej: Frodo Bolson"></td>
                            </tr>
                            <tr>
                                <td>Raza:</td>
                                <td>
                                    <select name="raza" required>
                                        <option value="">-- Seleccione una Raza --</option>
                                        <option value="Enano">Enano</option>
                                        <option value="Elfo">Elfo</option>
                                        <option value="Humano">Humano</option>
                                        <option value="Hobbit">Hobbit</option>
                                        <option value="Mago">Mago</option>
                                        <option value="Orco">Orco</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>Arma Principal:</td>
                                <td><input type="text" name="arma" required placeholder="Ej: Dardo"></td>
                            </tr>
                            <tr>
                                <td>Nivel de Poder:</td>
                                <td><input type="number" name="nivel_poder" min="1" required placeholder="Ej: 500"></td>
                            </tr>
                            <tr>
                                <td colspan="2" style="text-align: center; padding-top: 15px;">
                                    <input type="submit" value="Añadir a la Comunidad">
                                </td>
                            </tr>
                        </table>
                    </form>
                </div>

                <h2>Fuerzas Desplegadas</h2>
                <table class="tabla-datos">
                    <tr>
                        <th>ID</th><th>NOMBRE</th><th>RAZA</th><th>ARMA</th><th>PODER BASE</th><th>ACCIONES</th>        
                    </tr>
                    ${fila}
                </table>            

                <div class="panel-totales" style="width: 710px;">
                    <p>Cantidad de Guerreros: <b>${cantidadPersonajes}</b></p>
                    <p>Poder Base Combinado: <b>${poderTotal} pts</b></p>
                    <p style="color: #2980b9;">Bonus de Alianza Táctica (15% si ≥ 4): <b>+${bonusAlianza} pts</b></p>
                    <hr>
                    <h2 style="color: #27ae60; margin: 0;">PODER DE COMBATE EFECTIVO: ${poderFinal} pts</h2>
                </div>
            </center>
        `;  
        res.send(cabecera + contenido + final);       
    });
});

server.post("/ingresar_personaje", (req, res) => {
    const { nombre, raza, arma, nivel_poder } = req.body;
    const consulta = "INSERT INTO personajes_lotr (nombre, raza, arma, nivel_poder) VALUES (?, ?, ?, ?)";
    
    conexion.query(consulta, [nombre, raza, arma, nivel_poder], (error) => {
        if (error) {
            console.log(error);
            res.send(cabecera + "<center><h2>Error al registrar</h2><br><a href='/personajes'>Volver</a></center>" + final);
        } else {
            res.redirect("/personajes");
        }
    });
});
//delete
server.get("/eliminar_personaje", (req, res) => {
    const id_eliminar = req.query.id;
    const consulta = "DELETE FROM personajes_lotr WHERE id = ?";
    
    conexion.query(consulta, [id_eliminar], (error) => {
        if (error) {
            console.log(error);
            res.send(cabecera + "<center><h2>Error al eliminar</h2><br><a href='/personajes'>Volver</a></center>" + final);
        } else {
            res.redirect("/personajes");
        }
    });
});

//modificar
server.get("/editar_personaje", (req, res) => {  
    const id_editar = req.query.id;

    conexion.query("SELECT * FROM personajes_lotr WHERE id = ?", [id_editar], (err, data) => {
        if (err || data.length === 0) {
            return res.send(cabecera + "<center><h2>No se encontró el registro</h2><br><a href='/personajes'>Volver</a></center>" + final);
        }

        const personaje = data[0]; 
        const checkSelect = (razaActual, razaOpcion) => razaActual === razaOpcion ? "selected" : "";

        const contenido = `
            <center>
            <h2>Modificar Atributos de Guerrero</h2>
            
            <div class="box-formulario" style="width: 500px;">
                <form action="/actualizar_personaje" method="POST">
                    
                    <input type="hidden" name="id" value="${personaje.id}"> 
                    
                    <table class="form-table">
                        <tr>
                            <td>NOMBRE:</td>
                            <td><input type="text" name="nombre" value="${personaje.nombre}" required></td>
                        </tr>
                        <tr>
                            <td>RAZA:</td>
                            <td>
                                <select name="raza" required>
                                    <option value="Enano" ${checkSelect(personaje.raza, 'Enano')}>Enano</option>
                                    <option value="Elfo" ${checkSelect(personaje.raza, 'Elfo')}>Elfo</option>
                                    <option value="Humano" ${checkSelect(personaje.raza, 'Humano')}>Humano</option>
                                    <option value="Hobbit" ${checkSelect(personaje.raza, 'Hobbit')}>Hobbit</option>
                                    <option value="Mago" ${checkSelect(personaje.raza, 'Mago')}>Mago</option>
                                    <option value="Orco" ${checkSelect(personaje.raza, 'Orco')}>Orco</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>ARMA:</td>
                            <td><input type="text" name="arma" value="${personaje.arma}" required></td>
                        </tr>
                        <tr>
                            <td>PODER:</td>
                            <td><input type="number" name="nivel_poder" value="${personaje.nivel_poder}" min="1" required></td>
                        </tr> 
                        <tr>
                            <td colspan="2" style="text-align: center; padding-top: 15px;">
                                <input type="submit" value="Guardar Cambios">
                                <a href="/personajes" class="btn-cancelar">Cancelar</a>
                            </td>
                        </tr>                                                                                    
                    </table> 
                </form>
            </div>
            </center>
        `; 
        res.send(cabecera + contenido + final);  
    });
});
//update
server.post("/actualizar_personaje", (req, res) => {
    const { id, nombre, raza, arma, nivel_poder } = req.body;
    const consulta = "UPDATE personajes_lotr SET nombre = ?, raza = ?, arma = ?, nivel_poder = ? WHERE id = ?";
    
    conexion.query(consulta, [nombre, raza, arma, nivel_poder, id], (error) => {
        if (error) {
            console.log(error);
            res.send(cabecera + "<center><h2>Error al guardar cambios</h2><br><a href='/personajes'>Volver</a></center>" + final);
        } else {
            res.redirect("/personajes");
        }
    });
});


server.listen(3000, () => {
    console.log('Servidor CRUD de la Tierra Media corriendo exitosamente en el puerto 3000');
});