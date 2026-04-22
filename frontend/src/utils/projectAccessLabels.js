const PROJECT_PERMISSION_LABELS = {
  ver_inventario: 'View inventory',
  gestionar_inventario: 'Manage inventory',
  editar_proyecto: 'Edit project',
  gestionar_tareas: 'Manage tasks',
  asignar_usuarios: 'Assign users',
  gestionar_presupuesto: 'Manage budget',
  crear_reportes: 'Create reports',
}

export function projectPermissionLabel(name) {
  return PROJECT_PERMISSION_LABELS[name] || name
}

export function projectPermissionListLabel(names = []) {
  if (!Array.isArray(names) || names.length === 0) return ''
  return names.map(projectPermissionLabel).join(', ')
}
