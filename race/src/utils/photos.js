// ¿La gráfica muestra fotos? (PERSONALIZAR > "Mostrar fotos de los pilotos", config.showPhotos_<id>)
export const photosEnabled = (config, id) => !!config?.photosPath && config?.[`showPhotos_${id}`] === true;
