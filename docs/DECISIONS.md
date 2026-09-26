# Decisiones

- **Mercado por defecto:** Venezuela, USD como moneda principal; VES y EUR solo como conversión referencial (tabla `FxRate`, editable por el superadmin).
- **Mapa inicial:** Caracas. En búsqueda el mapa se ajusta a los resultados y hay selector Caracas / Venezuela.
- **Lujo:** «Lomas de San Raphael» del brief se escribió como *Lomas de San Román* (urbanización real de Caracas).
- **Los Roques** es un listing *demo* (marcado así en la ficha).
- **PlaceEstimate** se calcula con el proveedor de IA activo y se guarda como snapshot por listing; con proveedor externo se valida el JSON y, si falla, se usa el heurístico.
- **SLA de leads:** 15 min desde la creación; barra verde → ámbar → rojo; `firstResponseAt` se fija con la primera respuesta.
- **Calidad de ficha:** fotos ≥ 8 (35) + bilingüe (20) + geo (20) + plano (15) + tour virtual (10).
- **Moderación:** los listings creados por agentes quedan `PENDING` hasta que el dueño/backoffice los aprueba; el superadmin puede retirarlos con motivo (desaparecen de la búsqueda al instante).
- **Anti-duplicados:** huella = dirección normalizada + m² + habitaciones; al publicar se avisa si ya existe.
- **Comisión:** % por agencia + split del agente (Andes Prime: 5 % / 50 %).
- **Sesiones JWT** (no de base de datos) para que el middleware edge pueda comprobar el rol sin consultar Postgres.
- **Zona horaria:** agenda y slots en America/Caracas (UTC-4); semana empieza en lunes.
- **Datos seed** con fechas relativas a la ejecución para que dashboards, SLA y agenda siempre tengan datos «de hoy».
