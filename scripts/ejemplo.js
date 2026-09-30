const fs=require('fs'); const {generarPDF}=require('../lib/pdf');
const d={nombres:'Dayhana Lucía',apellidoPaterno:'Muñoz',apellidoMaterno:'Ramírez',tipoDocumento:'DNI',numeroDocumento:'72345678',nacionalidad:'Peruana',estadoCivil:'Soltero(a)',sexo:'Femenino',fechaNacimiento:'1998-04-15',nacDepartamento:'Junín',nacProvincia:'Huancayo',nacDistrito:'El Tambo',cargoPostula:'Asistente de Recursos Humanos',
celular:'987654321',telefonoFijo:'014567890',email:'dayhana.munoz@gmail.com',direccion:'Av. Nicolás Ayllón 5818, Urb. Los Portales de Javier Prado, Mz. B Lt. 12',distrito:'Ate',provincia:'Lima',departamento:'Lima',numeroPasaporte:'',brevete:'Q12345678',
emergencia:[{nombre:'Rosa Ramírez Soto',telefono:'999888777',direccion:'Av. Central 123, Ate'},{nombre:'Luis Muñoz',telefono:'988777666',direccion:'Jr. Lima 456'}],
padre:[{apellidos:'Muñoz Pérez',nombres:'Luis Alberto',fechaNac:'1965-02-10',documento:'08123456'}],madre:[{apellidos:'Ramírez Soto',nombres:'Rosa',fechaNac:'1968-07-21',documento:'08654321'}],
hermanos:[{apellidos:'Muñoz Ramírez',nombres:'Carlos',fechaNac:'2001-01-01',documento:'74561234'}],conyuge:[],hijos:[{apellidos:'Torres Muñoz',nombres:'Mateo',sexo:'M',fechaNac:'2020-05-05',documento:'90123456'}],
nivelEstudios:'Bachiller',primaria:[{centro:'IE 1234 José Olaya',fechas:'2004 – 2009'}],secundaria:[{centro:'IE Mariscal Cáceres',fechas:'2010 – 2014'}],tecnicos:[],universitarios:[{carrera:'Administración de Empresas',grado:'Bachiller',institucion:'Universidad Nacional Mayor de San Marcos',fechas:'2015 – 2020'}],
otrosEstudios:[{curso:'Diplomado en Gestión del Talento',institucion:'ESAN',fechas:'2022 – 2023'}],idiomas:[{idioma:'Inglés',institucion:'ICPNA',nivel:'Intermedio'}],
tiempoExperiencia:'3 años y 6 meses',experiencias:[{empresa:'Alicorp S.A.A.',cargo:'Practicante de RR. HH.',fechas:'03/2021 – 12/2021'},{empresa:'Ripley',cargo:'Asistente de Selección',fechas:'01/2022 – 08/2024'}],
referencias:[{nombre:'María López',empresa:'Ripley',cargo:'Jefa de Selección',telefono:'987111222'}],
recibioBoletin:true,opcionPension:'Afiliarme al Sistema Privado de Pensiones (AFP)',afp:'INTEGRA',bancoHaberes:'BCP',bancoCTS:'Interbank',monedaCTS:'Soles'};
generarPDF({codigo:'DAYHANA-MUNOZ-001',fechaRegistro:new Date().toISOString(),datos:d}).then(b=>{fs.writeFileSync('DAYHANA-MUNOZ-001.pdf',b);console.log('ok',b.length)});
