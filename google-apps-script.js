// =================================================================================
// Google Apps Script para Notificaciones de "Pasaporte de Capacitación"
// =================================================================================
//
// INSTRUCCIONES DE CONFIGURACIÓN:
//
// 1. **CREAR UN NUEVO SCRIPT:**
//    - Ve a script.google.com y crea un nuevo proyecto.
//    - Borra el contenido por defecto y pega TODO este código en el editor.
//    - Guarda el proyecto con un nombre como "Notificaciones Pasaporte".
//
// 2. **CONFIGURAR VARIABLES GLOBALES (AQUÍ ABAJO):**
//    - Rellena las variables `GCP_PROJECT_ID`, `GCP_PROJECT_EMAIL` y `GCP_PRIVATE_KEY`
//      con los datos de tu cuenta de servicio de Firebase.
//    - Puedes encontrar estos datos en Firebase Console > Project Settings > Service accounts.
//      Genera una nueva clave privada si no tienes una.
//
// 3. **AÑADIR SERVICIOS DE GOOGLE:**
//    - En el editor de Apps Script, en el menú de la izquierda, haz clic en "Servicios +".
//    - Busca y añade el servicio "Firestore".
//    - Busca y añade el servicio "OAuth2".
//
// 4. **CONFIGURAR LOS DISPARADORES (TRIGGERS):**
//    - En el menú de la izquierda, ve a "Disparadores" (el icono del reloj).
//    - Crea un nuevo disparador para la función `notificarNuevasAsignaciones`:
//      - Evento: Basado en tiempo (Time-driven)
//      - Tipo: Temporizador de minutos (Minutes timer)
//      - Frecuencia: Cada 5 o 10 minutos (para que las notificaciones de asignación sean rápidas).
//    - Crea otro disparador para la función `enviarResumenMensual`:
//      - Evento: Basado en tiempo (Time-driven)
//      - Tipo: Temporizador de mes (Month timer)
//      - Frecuencia: El día 1 de cada mes.
//
// 5. **EJECUTAR Y AUTORIZAR:**
//    - La primera vez que ejecutes una función (p. ej., `testResumenMensual`),
//      Google te pedirá permisos para acceder a Firestore y enviar correos. Acepta los permisos.
//
// =================================================================================

// --- CONFIGURACIÓN GLOBAL --- (¡RELLENA ESTOS VALORES!)
const GCP_PROJECT_ID = 'TU_ID_DE_PROYECTO_FIREBASE'; // Ej: 'pasaporte-app-12345'
const GCP_PROJECT_EMAIL = 'TU_EMAIL_DE_CUENTA_DE_SERVICIO'; // Ej: 'firebase-adminsdk-xyz@pasaporte-app-12345.iam.gserviceaccount.com'
const GCP_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\n...TU_CLAVE_PRIVADA...\\n-----END PRIVATE KEY-----\\n';

// --- FIN DE LA CONFIGURACIÓN ---


/**
 * Obtiene un token de acceso autenticado para la API de Firestore.
 */
function getFirestoreService() {
  return OAuth2.createService('Firestore')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(GCP_PRIVATE_KEY)
    .setIssuer(GCP_PROJECT_EMAIL)
    .setSubject(GCP_PROJECT_EMAIL)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope('https://www.googleapis.com/auth/datastore');
}

/**
 * Función principal para enviar el resumen mensual. Se activa con un disparador mensual.
 */
function enviarResumenMensual() {
  const firestore = FirestoreApp.getFirestore(GCP_PROJECT_EMAIL, GCP_PRIVATE_KEY, GCP_PROJECT_ID);
  
  const users = firestore.getDocuments('users');
  const trainings = firestore.getDocuments('trainings');
  const assignments = firestore.getDocuments('assignments');
  
  const trainingsMap = new Map(trainings.map(t => [t.documentId, t.fields]));
  
  // Agrupar asignaciones por responsable (trainerName)
  const reportesPorResponsable = {};

  trainings.forEach(trainingDoc => {
    const training = trainingDoc.fields;
    const trainerName = training.trainerName ? training.trainerName.stringValue : 'Sin Responsable';
    const trainingId = trainingDoc.documentId;
    
    if (!reportesPorResponsable[trainerName]) {
      reportesPor-responsable[trainerName] = {
        email: '',
        pendientes: [],
        atrasadas: []
      };
    }
    
    const relevantAssignments = assignments.filter(a => a.fields.trainingId.stringValue === trainingId && a.fields.status.stringValue === 'pending');
    
    if (relevantAssignments.length > 0) {
      const hoy = new Date();
      const fechaPrevista = training.scheduledDate ? new Date(training.scheduledDate.stringValue) : null;
      
      const infoCapacitacion = `<li><b>${training.title.stringValue}</b> - ${relevantAssignments.length} persona(s) pendiente(s)</li>`;

      if (fechaPrevista && fechaPrevista < hoy) {
        reportesPorResponsable[trainerName].atrasadas.push(infoCapacitacion);
      } else {
        reportesPorResponsable[trainerName].pendientes.push(infoCapacitacion);
      }
    }
  });

  // Encontrar email del responsable y enviar correo
  for (const trainerName in reportesPorResponsable) {
    const user = users.find(u => u.fields.name.stringValue === trainerName);
    if (user && user.fields.email) {
      const reporte = reportesPorResponsable[trainerName];
      const emailResponsable = user.fields.email.stringValue;
      
      if (reporte.pendientes.length > 0 || reporte.atrasadas.length > 0) {
        let asunto = `Resumen Mensual de Capacitaciones: ${trainerName}`;
        let cuerpoHtml = `Hola ${trainerName},<br><br>Este es tu resumen mensual de capacitaciones asignadas:<br><br>`;
        
        if (reporte.atrasadas.length > 0) {
          cuerpoHtml += `<h3><font color="red">Capacitaciones Atrasadas:</font></h3><ul>${reporte.atrasadas.join('')}</ul><br>`;
        }
        
        if (reporte.pendientes.length > 0) {
          cuerpoHtml += `<h3>Capacitaciones Pendientes:</h3><ul>${reporte.pendientes.join('')}</ul><br>`;
        }

        cuerpoHtml += 'Por favor, revisa el <a href="URL_DE_TU_APP">panel de administración</a> para más detalles.<br><br>Saludos,<br>Sistema Pasaporte de Capacitación.';
        
        MailApp.sendEmail(emailResponsable, asunto, '', { htmlBody: cuerpoHtml });
      }
    }
  }
}

/**
 * Notifica sobre nuevas asignaciones. Se activa cada 5-10 minutos.
 */
function notificarNuevasAsignaciones() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const lastRunTimestamp = scriptProperties.getProperty('lastAssignmentCheck');
  const now = new Date();
  const firestore = FirestoreApp.getFirestore(GCP_PROJECT_EMAIL, GCP_PRIVATE_KEY, GCP_PROJECT_ID);

  const assignments = firestore.getDocuments('assignments');
  
  const nuevasAsignaciones = assignments.filter(a => {
    const assignedDate = new Date(a.fields.assignedDate.stringValue);
    return !lastRunTimestamp || assignedDate > new Date(lastRunTimestamp);
  });

  if (nuevasAsignaciones.length > 0) {
    const trainings = firestore.getDocuments('trainings');
    const users = firestore.getDocuments('users');
    const trainingsMap = new Map(trainings.map(t => [t.documentId, t.fields]));
    const usersMap = new Map(users.map(u => [u.documentId, u.fields]));

    // Agrupar notificaciones por responsable
    const notificacionesPorResponsable = {};

    nuevasAsignaciones.forEach(assignmentDoc => {
      const assignment = assignmentDoc.fields;
      const training = trainingsMap.get(assignment.trainingId.stringValue);
      const user = usersMap.get(assignment.userId.stringValue);

      if (training && user) {
        const trainerName = training.trainerName ? training.trainerName.stringValue : 'Sin Responsable';
        if (!notificacionesPorResponsable[trainerName]) {
          notificacionesPorResponsable[trainerName] = [];
        }
        notificacionesPorResponsable[trainerName].push(`<li><b>${training.title.stringValue}</b> asignada a ${user.name.stringValue}.</li>`);
      }
    });

    for (const trainerName in notificacionesPorResponsable) {
       const userResponsable = users.find(u => u.fields.name.stringValue === trainerName);
       if (userResponsable && userResponsable.fields.email) {
          const emailResponsable = userResponsable.fields.email.stringValue;
          const asunto = `Nuevas Capacitaciones Asignadas`;
          const listaHtml = notificacionesPorResponsable[trainerName].join('');
          const cuerpoHtml = `Hola ${trainerName},<br><br>Se han asignado nuevas capacitaciones bajo tu responsabilidad:<ul>${listaHtml}</ul><br>Puedes ver los detalles en el panel de administración.`;
          
          MailApp.sendEmail(emailResponsable, asunto, '', { htmlBody: cuerpoHtml });
       }
    }
  }
  
  // Guardar la fecha de esta ejecución para la próxima vez
  scriptProperties.setProperty('lastAssignmentCheck', now.toISOString());
}


// --- FUNCIONES DE PRUEBA ---
// Puedes ejecutar estas manualmente desde el editor de Apps Script para probar sin esperar los disparadores.

/**
 * Prueba el envío del resumen mensual para un solo responsable.
 */
function testResumenMensual() {
  const firestore = FirestoreApp.getFirestore(GCP_PROJECT_EMAIL, GCP_PRIVATE_KEY, GCP_PROJECT_ID);
  
  const users = firestore.getDocuments('users');
  const trainerName = "Admin"; // Cambia esto al nombre de un responsable que exista para probar
  const user = users.find(u => u.fields.name.stringValue === trainerName);
  
  if (user && user.fields.email) {
    const emailResponsable = user.fields.email.stringValue;
    const asunto = 'PRUEBA - Resumen Mensual';
    const cuerpoHtml = 'Este es un correo de prueba del sistema de notificación de Pasaporte de Capacitación.';
    MailApp.sendEmail(emailResponsable, asunto, '', { htmlBody: cuerpoHtml });
    Logger.log(`Correo de prueba enviado a ${emailResponsable}`);
  } else {
    Logger.log(`No se encontró al usuario responsable: ${trainerName}`);
  }
}
