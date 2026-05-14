/**
 * helpContent.ts — Contenidos de ayuda para cada módulo
 * Usado por HelpDrawer en cada página del ERP
 */
import { HelpDrawerConfig } from '@/components/HelpDrawer';

export const HELP_INVENTARIO: HelpDrawerConfig = {
  moduleId: 'inventario',
  moduleName: 'Inventario',
  description: 'Controla cuánto tienes de cada ingrediente, a qué costo lo compraste y cuándo pedir más. El sistema te avisa automáticamente antes de quedarte sin stock.',
  sections: [
    { title: 'Alertas', content: 'Muestra los ingredientes que ya están por debajo del mínimo. Actúa aquí primero cada mañana.' },
    { title: 'Analítica', content: 'Tendencias de consumo por ingrediente. Te ayuda a identificar qué ingredientes se usan más y en qué días.' },
    { title: 'Pronóstico', content: 'Basado en tu historial, predice cuánto vas a necesitar la próxima semana para que no te quedes sin nada.' },
    { title: 'Ingredientes', content: 'Lista completa de tu inventario con stock actual. El equipo registra entradas y salidas desde aquí.' },
    { title: 'Movimientos', content: 'Historial de todas las entradas y salidas. Útil para auditar o entender por qué bajó el stock.' },
  ],
  glossary: [
    { term: 'Stock mínimo', definition: 'La cantidad más baja que puedes tener antes de que el sistema te mande una alerta. Tú lo defines según cuánto consumes.' },
    { term: 'Punto de Reorden (RoP)', definition: 'El nivel de stock en que debes hacer el pedido al proveedor para que llegue antes de que te quedes sin nada. El sistema lo calcula con tu historial y el lead time del proveedor.' },
    { term: 'WACC (Costo Ponderado)', definition: 'El costo promedio de un ingrediente considerando todas tus compras a diferentes precios. Si compras carne a $180/kg unas veces y $200 otras, el WACC es el promedio real de lo que tienes en bodega.' },
    { term: 'Lead time', definition: 'Los días que tarda en llegar un pedido de tu proveedor. Se configura en el perfil del proveedor.' },
    { term: 'Merma', definition: 'Lo que se pierde por caducidad, preparación o errores. Se registra como movimiento de salida con tipo "merma".' },
    { term: 'Conteo físico', definition: 'Verificación manual de lo que tienes en bodega para corregir diferencias entre el sistema y la realidad.' },
  ],
  flow: [
    'Cada mañana revisa el tab Alertas — atiende los ingredientes críticos primero.',
    'Cuando llegue un pedido, ve a Movimientos → Registrar entrada y anota la cantidad y el proveedor.',
    'Configura el stock mínimo de cada ingrediente para que las alertas sean precisas.',
    'Una vez a la semana haz un Conteo físico para sincronizar el sistema con la realidad.',
    'Usa Analítica para ver qué ingredientes tienen más consumo y ajustar tus compras.',
  ],
  tourSteps: [
    '👋 Bienvenido al Inventario. Este módulo te muestra exactamente cuánto tienes de cada ingrediente y te avisa antes de que te falte algo.',
    '🔴 Empieza siempre por el tab "Alertas" — ahí están los ingredientes que ya llegaron a su mínimo y necesitan atención hoy.',
    '📦 Cuando llegue un pedido, usa el botón "Registrar movimiento" → Entrada para actualizar el stock y vincularlo al proveedor.',
    '📊 El tab "Analítica" te muestra tendencias de consumo. Úsalo para anticiparte a la demanda del fin de semana.',
    '✅ Configura un "Stock mínimo" para cada ingrediente importante y el sistema trabajará solo para avisarte a tiempo.',
  ],
};

export const HELP_REPORTES: HelpDrawerConfig = {
  moduleId: 'reportes',
  moduleName: 'Reportes',
  description: 'Tu radiografía financiera. Desde aquí ves qué vendiste, cuánto te costó, qué platillos son más rentables y cómo va el negocio vs. lo que planeaste.',
  sections: [
    { title: 'Ventas & Platillos', content: 'Ventas del período, ticket promedio y top de platillos por ingresos y margen. Tu punto de partida diario.' },
    { title: 'P&L Financiero', content: 'Estado de resultados completo: ingresos, COGS, gastos operativos y utilidad. También incluye el balance general.' },
    { title: 'Presupuesto vs Real', content: 'Compara lo que planeaste gastar contra lo que realmente gastaste. Te dice si vas bien o si hay desviaciones.' },
  ],
  glossary: [
    { term: 'COGS', definition: 'Costo de los ingredientes que se usaron para producir lo que se vendió. Si vendes una hamburguesa de $120, el COGS es lo que costaron los ingredientes (carne, pan, etc.).' },
    { term: 'Margen bruto', definition: 'Lo que queda de cada venta después de descontar el costo de ingredientes. Margen del 65% significa que de cada $100 vendidos, $65 son utilidad antes de gastos.' },
    { term: 'Ticket promedio', definition: 'El valor promedio de cada orden/mesa en el período. Sube con upselling (postres, bebidas adicionales).' },
    { term: 'Punto de equilibrio', definition: 'Las ventas mínimas que necesitas al día para cubrir todos tus gastos fijos. Si vendes menos, pierdes dinero.' },
    { term: 'IVA trasladado', definition: 'El IVA que cobras a tus clientes y que debes entregar al SAT. No es ingreso tuyo.' },
    { term: 'Merma', definition: 'Pérdida económica por platillos cancelados o ingredientes desperdiciados. Reduce tu utilidad directamente.' },
  ],
  flow: [
    'Cada mañana abre Ventas & Platillos → selecciona "Ayer" para revisar cómo cerró el día.',
    'Revisa el margen por platillo — los que tienen margen bajo son candidatos a ajuste de precio o receta.',
    'Una vez a la semana revisa el P&L para ver si los gastos están bajo control.',
    'Compara contra el Presupuesto vs Real para detectar desviaciones antes de que se vuelvan problema.',
  ],
};

export const HELP_PROVEEDORES: HelpDrawerConfig = {
  moduleId: 'proveedores',
  moduleName: 'Proveedores',
  description: 'Gestiona a quién le compras, cuánto le debes y en qué condiciones. Cada compra de inventario genera automáticamente un cargo aquí.',
  sections: [
    { title: 'Lista de proveedores', content: 'Ve el saldo pendiente de cada proveedor con la barra de crédito en verde/amarillo/rojo según qué tan cerca estás del límite.' },
    { title: 'Detalle del proveedor', content: 'Haz click en un proveedor para ver sus insumos vinculados, historial de compras y pagos.' },
    { title: 'Registrar pago', content: 'Cuando pagues una factura, regístralo aquí para que el saldo se actualice. El sistema distingue entre cargos (compras) y abonos (pagos).' },
  ],
  glossary: [
    { term: 'Cuenta por pagar (CxP)', definition: 'Lo que le debes a un proveedor por compras que ya recibiste pero que aún no has pagado. Se genera automáticamente cuando registras una entrada de inventario con proveedor.' },
    { term: 'Límite de crédito', definition: 'El máximo que puedes deber a un proveedor. Si llegas al límite, el proveedor normalmente detiene los envíos.' },
    { term: 'Condiciones de pago', definition: 'El tiempo que tienes para pagar. "Crédito 30 días" significa que tienes un mes para pagar desde que recibes la mercancía.' },
    { term: 'Lead time', definition: 'Los días que tarda en llegar un pedido. El sistema lo usa para calcular cuándo debes hacer el siguiente pedido.' },
  ],
  flow: [
    'Cuando llegue mercancía, regístrala en Inventario → Registrar Movimiento → Entrada con el proveedor seleccionado.',
    'El cargo se crea automáticamente en la cuenta del proveedor.',
    'Cuando pagues la factura, ve al proveedor → Registrar pago.',
    'El saldo baja y el historial queda registrado con fecha y método de pago.',
  ],
};

export const HELP_MENU: HelpDrawerConfig = {
  moduleId: 'menu',
  moduleName: 'Menú',
  description: 'Gestiona tu carta completa — platillos, precios, disponibilidad y recetas. El margen de cada platillo se calcula automáticamente con el costo de sus ingredientes.',
  sections: [
    { title: 'Disponibilidad', content: 'El toggle verde/rojo en cada platillo lo activa o desactiva en el POS al instante. Si se acabó algo, desactívalo aquí.' },
    { title: 'Recetas', content: 'Define qué ingredientes lleva cada platillo y en qué cantidad. El sistema usa esto para descontar del inventario con cada venta.' },
    { title: 'Margen', content: 'Se calcula como: (Precio de venta - Costo de ingredientes) / Precio de venta. Un platillo con margen menor al 40% debería revisarse.' },
    { title: 'Asistente IA', content: 'Sube una foto de tu menú actual y la IA crea todos los platillos con categorías y precios sugeridos automáticamente.' },
  ],
  glossary: [
    { term: 'Margen de contribución', definition: 'Lo que "gana" cada platillo vendido después de descontar el costo de ingredientes. Un margen del 65% en una hamburguesa de $150 significa que $97.50 contribuyen a cubrir gastos fijos.' },
    { term: 'Costo por platillo', definition: 'La suma del costo de todos los ingredientes de la receta. Se actualiza automáticamente cuando cambia el WACC de un ingrediente.' },
    { term: 'Disponible / Agotado', definition: 'Controla si el platillo aparece en el POS. "Agotado" lo oculta del menú digital y del sistema para que los meseros no lo puedan ordenar.' },
    { term: 'Área de preparación', definition: 'Define si el platillo se prepara en Cocina o en Barra. Las órdenes se mandan automáticamente al display correcto.' },
  ],
  flow: [
    'Crea los platillos con su precio y categoría.',
    'Agrega la receta de cada platillo con sus ingredientes y cantidades.',
    'El sistema calcula el costo y el margen automáticamente.',
    'Cada venta descuenta del inventario los ingredientes de la receta.',
    'Si se acaba un ingrediente, el platillo puede marcarse como agotado automáticamente.',
  ],
};

export const HELP_CONFIGURACION: HelpDrawerConfig = {
  moduleId: 'configuracion',
  moduleName: 'Configuración',
  description: 'El punto de partida del sistema. Aquí defines cómo opera tu restaurante para que todo lo demás funcione correctamente.',
  sections: [
    { title: '¿Por dónde empezar?', content: 'Primero: datos del restaurante y sucursal. Segundo: mesas y áreas. Tercero: usuarios y roles. Cuarto: menú con el Asistente IA.' },
    { title: 'Usuarios y roles', content: 'Admin ve todo. Gerente ve reportes y operaciones. Cajero solo usa el POS. Mesero solo toma órdenes. Cocinero solo ve la cocina.' },
    { title: 'Mesas y áreas', content: 'Define tus mesas con número, capacidad y área (terraza, interior, barra). El POS y las reservaciones las usan.' },
    { title: 'Sucursales', content: 'Si tienes más de una ubicación, cada una tiene su propio inventario, menú y reportes pero comparten la configuración base.' },
  ],
  glossary: [
    { term: 'Tenant', definition: 'Tu restaurante como entidad en el sistema. Todo lo que configuras, inventario, ventas y reportes pertenece a tu tenant.' },
    { term: 'Sucursal / Branch', definition: 'Una ubicación física de tu restaurante. Una cadena puede tener múltiples sucursales bajo el mismo tenant.' },
    { term: 'Rol de usuario', definition: 'Define qué puede hacer cada persona en el sistema. Un mesero no debería ver los reportes financieros.' },
    { term: 'PIN de acceso', definition: 'Código de 4 dígitos para que el personal acceda rápido al POS sin contraseña. Solo el admin puede asignarlo.' },
  ],
  flow: [
    'Completa los datos de tu restaurante y sucursal principal.',
    'Crea las mesas de tu local con número y capacidad.',
    'Agrega a tu equipo: meseros, cajeros, cocineros con su rol y PIN.',
    'Usa el Asistente IA en Menú para importar tu carta en minutos.',
    'Configura los proveedores principales de tu inventario.',
    'Ya estás listo para operar — abre el POS y empieza a vender.',
  ],
  tourSteps: [
    '⚙️ Esta es la Configuración — el punto de partida de Aldente. Aquí defines cómo opera tu restaurante.',
    '🏠 Primero completa los Datos del restaurante: nombre, dirección, RFC, teléfono y horarios.',
    '🪑 Después ve a Mesas y Áreas para mapear tu local. El POS y las reservaciones necesitan esto.',
    '👥 En Usuarios, agrega a tu equipo con el rol correcto (mesero, cajero, cocinero) y asígnales un PIN.',
    '🚀 Una vez configurado lo básico, ve al Menú y usa el Asistente IA para importar tu carta en minutos.',
  ],
};
