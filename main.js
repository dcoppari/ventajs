const MAX_DAYS = 5;

class Producto {
  constructor(codigo, nombre, precioNeto, precioVenta, existencia, vencimiento) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.precioNeto = precioNeto;
    this.existencia = existencia;
    this.precioVenta = precioVenta;
    this.vencimiento = vencimiento;
  }
}

class GestionProductos {
  //
  // Inicializa la lista de productos vacia
  //
  constructor() {
    this.arrProductos = [];
  }

  //
  // Agrega un objecto producto al array de productos.
  //
  agregarProducto(codigo, nombre, precio_neto, cantidad, vto) {
    let existencia = parseInt(cantidad);
    let precioNeto = parseFloat(precio_neto);
    let precioVenta = Math.round(precioNeto * 1.21);
    let vencimiento = new Date(vto);
    let producto = new Producto(codigo, nombre, precioNeto, precioVenta, existencia, vencimiento);

    this.arrProductos.push(producto);
  }

  //
  // Buscar un producto
  //
  buscarProducto(codigo) {
    return this.arrProductos.find((producto) => producto.codigo === codigo);
  }

  //
  // Validar un producto
  //
  validaProducto(codigo, controlCantidad) {
    const fechaActual = new Date();
    const producto = this.buscarProducto(codigo);

    // Controlo que exista
    if (!producto) {
      swal({
        text: `Producto ${codigo} no encontrado.`,
        icon: "error",
      });
      return false;
    }

    // Controlo que haya existencias
    if (producto.existencia <= controlCantidad) {
      swal({
        text: `Producto ${producto.nombre} no cuenta con existencia disponible.`,
        icon: "error",
      });
      return false;
    }

    // Controla productos vencidos
    let diasVencido = Math.ceil((fechaActual - producto.vencimiento) / (1000 * 60 * 60 * 24));
    if (diasVencido > 0) {
      swal({
        text: `El producto: ${producto.codigo} - ${producto.nombre}, Venció hace ${diasVencido} días`,
        icon: "error",
      });
      return false;
    }

    return producto;
  }

  //
  // Funcion que muestra los resultados en base a los productos ingresados
  //
  mostrarResultado() {
    const fechaActual = new Date();

    if (this.arrProductos.length === 0) {
      console.log("No se ingresaron productos");
      return;
    }

    let totalProductos = this.arrProductos.length;
    let totalExistencia = 0;
    let totalExistenciaValorizada = 0;

    let listaVencidos = this.arrProductos.filter((a) => a.vencimiento < fechaActual);
    let productoMasCaro = this.arrProductos.sort((a, b) => b.precioNeto - a.precioNeto)[0];

    for (const producto of this.arrProductos) {
      totalExistencia += producto.existencia;
      totalExistenciaValorizada += producto.existencia * producto.precioNeto;
    }

    // Muestro por pantalla los resultados obtenidos en los cálculos
    console.log(`Total de productos: ${totalProductos}`);
    console.log(`Total de existencias: ${totalExistencia}`);
    console.log(`Total existencias valorizadas: ${totalExistenciaValorizada}`);
    console.log(`Producto más caro: ${productoMasCaro.nombre} $${productoMasCaro.precioVenta}`);

    // Muestro detalle de los productos vencidos
    console.log(`Listado de productos vencidos:`);

    for (const producto of listaVencidos) {
      let diasVencido = Math.ceil((fechaActual - producto.vencimiento) / (1000 * 60 * 60 * 24));
      let vencimiento = this.formatearFecha(producto.vencimiento);

      console.log(`El producto: ${producto.codigo} - ${producto.nombre}, Venció el ${vencimiento} hace ${diasVencido} días`);
    }
  }

  //
  // Utilizado para dar formato al visualizar la fecha
  //
  formatearFecha(fechaIngreso) {
    let dia = fechaIngreso.getDate();
    let mes = fechaIngreso.getMonth() + 1;
    let anio = fechaIngreso.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }
}

class Carrito {
  constructor(baseStock) {
    this.carrito = JSON.parse(localStorage.getItem("carrito") || '{"productos":[]}');
    this.baseStock = baseStock;
    this.mostrar();
  }

  //
  // Metodo para validar si la fecha de entrega esta en los plazos establecidos
  //
  validarEntrega(fecha) {
    const fechaActual = new Date();
    const fechaIngresada = new Date(fecha);

    // Valido que la fecha de entrega este dentro de los plazos posibles
    const fechaPosible = new Date();
    fechaPosible.setDate(fechaActual.getDate() + MAX_DAYS);

    return fechaIngresada >= fechaPosible ? true : false;
  }

  //
  // Agrega un producto al carrito, en caso de existir ya en el carrito incrementa la cantidad de unidades
  //
  agregar(codigo, cantidad, id = 0) {
    if (id != 0) {
      let posicion = this.carrito.productos.findIndex((producto) => producto.id === parseInt(id));
      let producto = this.carrito.productos[posicion];
      console.log(producto);
      producto.cantidad = parseInt(cantidad);
      producto.total = Math.round(parseFloat(producto.precioVenta) * parseFloat(producto.cantidad));
      this.carrito.productos[posicion] = producto;
    } else {
      // busco detalle del producto
      let producto = this.baseStock.buscarProducto(codigo);
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

      swal({
        title: "Desea borrar el producto?",
        text: `Va a borrar del carrito ${producto.cantidad} unidades de ${producto.nombre}`,
        icon: "warning",
        buttons: ["Cancelar", "Borrar"],
        dangerMode: true,
      }).then((borrar) => {
        if (borrar) {
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
    const fechaEntrega = document.getElementById("fechaEntrega");
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
    importeNeto.innerText = `$${Math.round(sumaNeto)}`;
    importeIVA.innerText = `$${Math.round(sumaIVA)}`;
    importeTotal.innerText = `$${Math.round(sumaTotal)}`;

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
    txtCantidad.value = "0";
    txtPrecio.innerText = "0.00";
    txtTotal.innerText = "0.00";
  }

  //
  // Grabar las modificaciones del carrito al localStorage
  //
  actualizarCarrito() {
    const carrito = JSON.stringify(this.carrito);
    localStorage.setItem("carrito", carrito);
    this.mostrar();
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

  const fechaEntrega = document.getElementById("fechaEntrega");
  fechaEntrega.onchange = (e) => {
    if (!miCarrito.validarEntrega(e.target.value)) {
      swal({
        title: "Fecha de entrega no válida",
        text: "Le fecha de entrega debe ser posterior dentro de 5 días o más",
        icon: "error",
      }).then((e.target.value = undefined));
    }
  };

  // eventos
  txtCodigo.onchange = (e) => {
    const codigo = e.target.value;
    const producto = miStock.buscarProducto(codigo);

    if (producto) {
      txtDescripcion.innerText = producto.nombre;
      txtPrecio.innerText = producto.precioVenta;
      txtTotal.innerText = parseInt(txtCantidad.value || 0) * parseFloat(txtPrecio.innerText);
    } else {
      swal({ text: "Código de producto inexistente", icon: "error" }).then(() => {
        document.getElementById("codigo").focus();
        document.getElementById("codigo").select();
      });
    }
  };

  txtCantidad.onchange = (e) => {
    const codigo = txtCodigo.value;
    const cantidad = parseInt(e.target.value || 0);

    if (miStock.validaProducto(codigo, cantidad)) {
      txtTotal.innerText = cantidad * parseFloat(txtPrecio.innerText);
    }
  };

  // Cargar un item a la grilla
  const btnCargar = document.getElementById("btnCargar");
  btnCargar.onclick = (e) => {
    miCarrito.agregar(txtCodigo.value, txtCantidad.value, txtId.value);
  };

  // Reinicializa el formulario
  const btnNuevo = document.getElementById("btnNuevo");
  btnNuevo.onclick = (e) => {
    swal({
      title: "Este proceso es irreversible",
      text: "Se borrarán todos los items del carrito.",
      icon: "warning",
      buttons: ["Cancelar", "Borrar"],
      dangerMode: true,
    }).then((borrar) => {
      if (borrar) {
        miCarrito.vaciar();
        swal({ text: "Carrito borrado exitosamente.", icon: "success" });
      }
    });
  };

  miCarrito.vaciar();
  miCarrito.agregar("7792123456782", 1);
  miCarrito.agregar("7793123456786", 5);
  miCarrito.agregar("7794123456780", 3);
  miCarrito.mostrar();
}

function llenarBase(baseStock) {
  baseStock.agregarProducto("7790123456785", "Leche largavida", 25.0, 50, "2023-12-31");
  baseStock.agregarProducto("7791123456789", "Yogur con cereales", 39.0, 30, "2023-07-01");
  baseStock.agregarProducto("7792123456782", "Queso de maquina", 59.0, 20, "2023-11-30");
  baseStock.agregarProducto("7793123456786", "Jamón cocido", 9.0, 100, "2023-09-30");
  baseStock.agregarProducto("7794123456780", "Pure de tomates", 49.0, 15, "2024-08-20");
  baseStock.agregarProducto("7795123456784", "Fideos moñito", 79.0, 10, "2023-12-31");
  baseStock.agregarProducto("7796123456788", "Aceite de oliva", 4.0, 200, "2024-07-31");
  baseStock.agregarProducto("7797123456781", "Galletitas surtido", 69.0, 5, "2023-10-10");
  baseStock.agregarProducto("7798123456785", "Café tostado", 89.0, 8, "2023-09-15");
  baseStock.agregarProducto("7799123456789", "Cerveza en lata", 14.0, 50, "2023-11-15");
}

// Inicializa la base de stock
const miStock = new GestionProductos();
llenarBase(miStock);

// Inicializa el objeto carrito
const miCarrito = new Carrito(miStock);

// Comienza ejecución
main();
