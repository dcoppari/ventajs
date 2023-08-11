// Mínimo de días que se necesitan para poder entregar el pedido
const MIN_DAYS = 5;

//
// Esta es una abstracción para poder obtener una lista de productos desde una API
// Se podría adaptar para tomar los datos desde otra fuentes respetando
// El formato que devuelve que es siempre un array de objetos: { codigo, nombre, precio, existencia, vencimiento }
//
async function obtenerProductos(filtro) {
  //
  // API de precios claros de argentina: https://www.preciosclaros.gob.ar/
  //
  const API_URL = "https://d3e6htiiul5ek9.cloudfront.net/prod";
  const parametros = "&array_sucursales=2011-1-23,22-1-31,22-1-3,2011-1-70,22-1-17,19-1-00812,2008-1-643,2011-1-289,22-1-20,2003-1-7550,12-1-97,19-1-03296,22-1-18,12-1-99,22-1-6,23-1-6260,22-1-16,22-1-24,19-1-00973,22-1-1,10-1-268,10-1-33,23-1-6262,10-1-32,19-1-00983,2003-2-10080,2011-1-83,2003-1-7290,2011-1-115,12-1-95&limit=50";

  // Si la busqueda es de un código de barras consulto por ese producto en particular, sino busco por filtro de palabras
  const codigoBarraRegExp = /^(779[0-9]{10})$/;
  const url = API_URL + (codigoBarraRegExp.test(filtro) ? "/producto?id_producto=" : "/productos?string=") + filtro + parametros;

  try {
    const respuesta = await fetch(url);
    const data = await respuesta.json();

    // Si es un producto unico devuelve 1 solo objeto por lo que debo convertirlo en array
    let obj = data.producto || data.productos;
    obj = Array.isArray(obj) ? obj : [obj];

    // Mapeo los objetos
    const productos = obj.map((producto) => ({
      codigo: producto.id,
      nombre: producto.nombre,
      precio: producto.precioMin, // Para representacion
      precioNeto: parseFloat(producto.precioMin / 1.21),
      precioVenta: parseFloat(producto.precioMin),
      existencia: producto.cantSucursalesDisponible,
      vencimiento: "2036-01-01", // Lo dejo por compatibilidad
    }));

    return productos;
  } catch (error) {
    alert("Servicio no disponible momentaneamente");
    console.error("Error al obtener datos:", error);
  }
  return [];
}

class GestionProductos {
  //
  // Inicializa la lista de productos vacia
  //
  constructor() {
    this.arrProductos = [];
    this.inicializarAyuda();
  }

  //
  // Buscar un producto 7790360966841
  //
  async buscarProducto(codigo) {
    let resultado = await obtenerProductos(codigo);
    return resultado.find((producto) => producto.codigo === codigo);
  }

  //
  // Validar un producto
  //
  async validaProducto(codigo, controlCantidad) {
    const fechaActual = new Date();
    const producto = await this.buscarProducto(codigo);

    // Controlo que exista
    if (!producto) {
      Swal.fire({
        text: `Producto ${codigo} no encontrado.`,
        icon: "error",
      });
      return false;
    }

    // Controlo que haya existencias
    if (producto.existencia <= controlCantidad) {
      Swal.fire({
        text: `Producto ${producto.nombre} no cuenta con existencia disponible.`,
        icon: "error",
      });
      return false;
    }

    // Controla productos vencidos
    let diasVencido = Math.ceil((fechaActual - producto.vencimiento) / (1000 * 60 * 60 * 24));
    if (diasVencido > 0) {
      Swal.fire({
        text: `El producto: ${producto.codigo} - ${producto.nombre}, Venció hace ${diasVencido} días`,
        icon: "error",
      });
      return false;
    }

    return producto;
  }

  inicializarAyuda() {
    // Objeto del frame modal para la ayuda
    const modalAyuda = new bootstrap.Modal(document.getElementById("modal-ayuda"));

    // Función para llenar la tabla con los datos
    async function llenarBusqueda(textoBusqueda) {
      const tabla = document.getElementById("tablaBusquedaDetalle");

      if (textoBusqueda.trim().length < 3) {
        Swal.fire({
          text: "Debe ingresar al menos 3 caracteres para la busqueda",
          icon: "error",
        });
        return;
      }

      // Limpio la tabla antes de llenarla
      tabla.innerHTML = "";

      const listaProductos = await obtenerProductos(textoBusqueda);

      for (const producto of listaProductos) {
        const fila = document.createElement("tr");

        fila.setAttribute("data-codigo", producto.codigo);

        fila.innerHTML = `
          <td>${producto.codigo}</td>
          <td>${producto.nombre}</td>
          <td>${producto.precio.toFixed(2)}</td>
          <td>${producto.existencia > 0 ? "SI" : "NO"}</td>
        `;

        fila.onclick = (e) => {
          const codigo = e.currentTarget.getAttribute("data-codigo") || null;
          const txtCodigo = document.getElementById("codigo");
          modalAyuda.hide();
          if (codigo != null) {
            txtCodigo.value = codigo;
            // Fuerzo el evento change
            const changeEvent = new Event("change");
            txtCodigo.dispatchEvent(changeEvent);
          }
        };

        tabla.appendChild(fila);
      }
    }

    const btnAyuda = document.getElementById("btnAyuda");
    const btnBuscar = document.getElementById("btnBuscar");
    const txtBusqueda = document.getElementById("txtBusqueda");
    const spinnerAyuda = document.getElementById("modal-ayuda-spinner");

    btnAyuda.onclick = (e) => {
      btnBuscar.onclick = (e) => {
        // Deshabilito componentes
        btnBuscar.disabled = true;
        txtBusqueda.disabled = true;
        spinnerAyuda.classList.remove("d-none");

        llenarBusqueda(txtBusqueda.value).finally(() => {
          // Habilito componentes
          btnBuscar.disabled = false;
          txtBusqueda.disabled = false;
          spinnerAyuda.classList.add("d-none");
        });
      };
      modalAyuda.show();
    };
  }
}

class Carrito {
  constructor(baseStock) {
    this.carrito = JSON.parse(localStorage.getItem("carrito") || '{"esEnvio": false, "productos":[]}');
    this.baseStock = baseStock;
    this.mostrar();
  }

  //
  // Metodo para validar si la fecha de entrega esta en los plazos establecidos
  //
  validarFechaEntrega(fecha) {
    const fechaActual = new Date();
    const fechaIngresada = new Date(fecha);

    // Valido que la fecha de entrega este dentro de los plazos posibles
    const fechaPosible = new Date();
    fechaPosible.setDate(fechaActual.getDate() + MIN_DAYS);

    return fechaIngresada >= fechaPosible ? true : false;
  }

  //
  // Guardar los datos de entrega
  //
  guardarDatosEntrega(nombre, domicilio, email, fecha) {
    this.carrito.envio = {
      nombreCliente: nombre,
      domicilioCliente: domicilio,
      emailCliente: email,
      fechaEntrega: fecha,
    };

    this.actualizarCarrito();
  }

  //
  // Borrar los datos de la entrega
  //
  borrarDatosEntrega() {
    delete this.carrito.envio;
    this.actualizarCarrito();
  }

  //
  // Agrega un producto al carrito, en caso de existir ya en el carrito incrementa la cantidad de unidades
  //
  async agregar(codigo, cantidad, id = 0) {
    if (id != 0) {
      let posicion = this.carrito.productos.findIndex((producto) => producto.id === parseInt(id));
      let producto = this.carrito.productos[posicion];
      producto.cantidad = parseInt(cantidad);
      producto.total = Math.round(parseFloat(producto.precioVenta) * parseFloat(producto.cantidad));
      this.carrito.productos[posicion] = producto;
    } else {
      // busco detalle del producto
      let producto = await this.baseStock.buscarProducto(codigo);
      producto.id = this.carrito.productos.length + 1;
      producto.cantidad = parseInt(cantidad);
      producto.total = Math.round(parseFloat(producto.precioVenta) * parseFloat(producto.cantidad));
      this.carrito.productos.push(producto);
    }

    this.actualizarCarrito();
  }

  //
  // Habilita la modificacion de un articulo
  //
  modificar(id) {
    const producto = this.carrito.productos.find((producto) => producto.id === id);

    if (producto) {
      const txtId = document.getElementById("itemId");
      const txtCodigo = document.getElementById("codigo");
      const txtDescripcion = document.getElementById("descripcion");
      const txtCantidad = document.getElementById("cantidad");
      const txtPrecio = document.getElementById("precio");
      const txtTotal = document.getElementById("total");

      txtId.value = producto.id;
      txtCodigo.value = producto.codigo;
      txtDescripcion.innerText = producto.nombre;
      txtCantidad.value = producto.cantidad;
      txtPrecio.innerText = producto.precioVenta;
      txtTotal.innerText = producto.total;

      txtCodigo.focus();
      txtCodigo.select();
    }
  }

  //
  // Borra un producto del carrito
  //
  borrar(id) {
    const posicion = this.carrito.productos.findIndex((producto) => producto.id === id);

    if (posicion !== -1) {
      const producto = this.carrito.productos[posicion];

      Swal.fire({
        title: "Desea borrar el producto?",
        text: `Va a borrar del carrito ${producto.cantidad} unidades de ${producto.nombre}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Borrar",
        cancelButtonText: "Cancelar",
      }).then((borrar) => {
        if (borrar.isConfirmed) {
          this.carrito.productos.splice(posicion, 1);
          this.actualizarCarrito();
        }
      });
    }
  }

  //
  // Vacía el carrito
  //
  vaciar() {
    this.carrito = { productos: [] };
    this.actualizarCarrito();
  }

  //
  // Actualizar la pantalla de carga
  //
  mostrar() {
    const btnEnvio = document.getElementById("btnEnvio");
    const btnFinalizar = document.getElementById("btnFinalizar");
    const txtNombreCliente = document.getElementById("nombreCliente");
    const txtDomicilioCliente = document.getElementById("domicilioCliente");
    const txtEmailCliente = document.getElementById("emailCliente");
    const txtFechaEntrega = document.getElementById("fechaEntrega");

    // Muestro datos de envio
    if (this.carrito.esEnvio) {
      txtNombreCliente.value = this.carrito.envio.nombreCliente;
      txtDomicilioCliente.value = this.carrito.envio.domicilioCliente;
      txtEmailCliente.value = this.carrito.envio.emailCliente;
      txtFechaEntrega.value = this.carrito.envio.fechaEntrega;
      btnEnvio.innerHTML = `Información de Envío
      <span class="badge bg-warning text-dark">Cargada</span>      `;
    } else {
      btnEnvio.innerHTML = `Información de Envío`;
    }
    btnFinalizar.disabled = this.carrito.items == 0;
    const lista = document.getElementById("detalle_productos");

    const importeNeto = document.getElementById("importeNeto");
    const importeIVA = document.getElementById("importeIVA");
    const importeTotal = document.getElementById("importeTotal");

    let sumaNeto = 0;
    let sumaIVA = 0;
    let sumaTotal = 0;

    // Limpio la lista de items
    lista.innerHTML = "";

    // Lleno la lista
    for (const producto of this.carrito.productos) {
      let html = `
        <td>${producto.codigo}</td>
        <td>${producto.nombre}</td>
        <td>${producto.cantidad}</td>
        <td>$${producto.precioVenta}</td>
        <td>$${producto.total}</td>
        <td>
          <button onclick="miCarrito.modificar(${producto.id})" class="btn-modifica btn btn-primary btn-sm"><i class="fas fa-pencil-alt fa-xs"></i></button>
          <button onclick="miCarrito.borrar(${producto.id})"    class="btn btn-danger btn-sm"><i class="fas fa-times fa-xs"></i></button>
        </td>
        `;

      let fila = document.createElement("tr");
      fila.innerHTML = html;
      lista.append(fila);

      sumaNeto += producto.precioNeto * producto.cantidad;
      sumaTotal += producto.total;
      sumaIVA = sumaTotal - sumaNeto;
    }

    // Muestro totales
    importeNeto.innerText = `$${Math.round(sumaNeto).toFixed(2)}`;
    importeIVA.innerText = `$${Math.round(sumaIVA).toFixed(2)}`;
    importeTotal.innerText = `$${Math.round(sumaTotal).toFixed(2)}`;

    // Limpio los cuadros de ingreso
    const txtId = document.getElementById("itemId");
    const txtCodigo = document.getElementById("codigo");
    const txtDescripcion = document.getElementById("descripcion");
    const txtCantidad = document.getElementById("cantidad");
    const txtPrecio = document.getElementById("precio");
    const txtTotal = document.getElementById("total");

    txtId.value = "0";
    txtCodigo.value = "";
    txtDescripcion.innerText = "\b";
    txtCantidad.value = "1";
    txtPrecio.innerText = "0.00";
    txtTotal.innerText = "0.00";
  }

  //
  // Grabar las modificaciones del carrito al localStorage
  //
  actualizarCarrito() {
    this.carrito.items = this.carrito.productos?.length || 0;
    this.carrito.esEnvio = this.carrito.envio != undefined;
    const carrito = JSON.stringify(this.carrito);
    if (localStorage.setItem("carrito", carrito) != false) {
      Toastify({ text: "Carrito Actualizado" }).showToast();
      this.mostrar();
    } else {
      Toastify({
        text: "Error al guardar carrito",
        style: {
          background: "red",
          color: "white",
        },
      }).showToast();
    }
  }
}

//
// Funcion Principal
//
function main() {
  const txtId = document.getElementById("itemId");
  const txtCodigo = document.getElementById("codigo");
  const txtDescripcion = document.getElementById("descripcion");
  const txtCantidad = document.getElementById("cantidad");
  const txtPrecio = document.getElementById("precio");
  const txtTotal = document.getElementById("total");

  const frmModalEnvio = new bootstrap.Modal(document.getElementById("modal-envio"));

  const txtNombreCliente = document.getElementById("nombreCliente");
  const txtDomicilioCliente = document.getElementById("domicilioCliente");
  const txtEmailCliente = document.getElementById("emailCliente");
  const txtFechaEntrega = document.getElementById("fechaEntrega");

  const btnGuardarEnvio = document.getElementById("btnGuardarEnvio");
  const btnBorrarEnvio = document.getElementById("btnBorrarEnvio");
  const btnCargar = document.getElementById("btnCargar");
  const btnNuevo = document.getElementById("btnNuevo");

  // validacion de la fecha de entrega
  txtFechaEntrega.onchange = (e) => {
    if (!miCarrito.validarFechaEntrega(e.target.value)) {
      Swal.fire({
        title: "Fecha de entrega no válida",
        text: `Le fecha de entrega debe ser posterior a ${MIN_DAYS} días a partir de la fecha`,
        icon: "error",
      }).then((e.target.value = undefined));
    }
  };

  // carga de un producto
  txtCodigo.onchange = async (e) => {
    const codigo = e.target.value;
    const producto = await miStock.buscarProducto(codigo);

    if (producto) {
      txtDescripcion.innerText = producto.nombre;
      txtPrecio.innerText = producto.precioVenta;
      txtTotal.innerText = parseInt(txtCantidad.value || 0) * parseFloat(txtPrecio.innerText);
      txtCantidad.focus();
      txtCantidad.select();
      e.preventDefault();
    } else {
      Swal.fire({ text: "Código de producto inexistente", icon: "error" }).then(() => {
        document.getElementById("codigo").focus();
        document.getElementById("codigo").select();
      });
    }
  };

  txtCantidad.onchange = async (e) => {
    const codigo = txtCodigo.value;
    const cantidad = parseInt(e.target.value || 0);

    if (await miStock.validaProducto(codigo, cantidad)) {
      txtTotal.innerText = cantidad * parseFloat(txtPrecio.innerText);
    }
  };

  // Cargar un item a la grilla
  btnCargar.onclick = (e) => {
    txtCodigo.value.trim() != "" && parseInt(txtCantidad.value) != 0 ? miCarrito.agregar(txtCodigo.value, txtCantidad.value, txtId.value) : null;
  };

  // Borrar los datos de envio
  btnBorrarEnvio.onclick = (e) => {
    Swal.fire({
      title: "Este proceso es irreversible",
      text: "Se borrarán los datos de envío.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Borrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then((borrar) => {
      if (borrar.isConfirmed) {
        miCarrito.borrarDatosEntrega();
        frmModalEnvio.hide();
      }
    });
  };

  // Guarda los datos de envio
  btnGuardarEnvio.onclick = (e) => {
    if (!miCarrito.validarFechaEntrega(txtFechaEntrega.value)) {
      Swal.fire({
        title: "Fecha de entrega no válida",
        text: `Le fecha de entrega debe ser posterior a ${MIN_DAYS} días a partir de la fecha`,
        icon: "error",
      }).then((e.target.value = undefined));
    } else {
      miCarrito.guardarDatosEntrega(txtNombreCliente.value, txtDomicilioCliente.value, txtEmailCliente.value, txtFechaEntrega.value);
      frmModalEnvio.hide();
    }
  };

  // Reinicializa el formulario
  btnNuevo.onclick = (e) => {
    Swal.fire({
      title: "Este proceso es irreversible",
      text: "Se borrarán todos los items del carrito.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Borrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then((borrar) => {
      if (borrar.isConfirmed) {
        miCarrito.vaciar();
        Swal.fire({ text: "Carrito borrado exitosamente.", icon: "success" });
      }
    });
  };

  btnFinalizar.onclick = (e) => {
    if (miCarrito.carrito.items == 0) {
      e.preventDefault();
      return;
    }
    Swal.fire({
      title: "Finalizacion del Proceso",
      text: "Este proceso guardaría el pedido en la base de datos y posteriormente imprimiria un comprobante",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Aceptar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then((accion) => {
      if (accion.isConfirmed) {
        miCarrito.vaciar();
        Swal.fire({ text: "Proceso Finalizado Exitosamente.", icon: "success" });
      }
    });
  };
}

// Inicializa manejo de productos
const miStock = new GestionProductos();

// Inicializa el objeto carrito
const miCarrito = new Carrito(miStock);

// Comienza ejecución
main();
