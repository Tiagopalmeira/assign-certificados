import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/modelos' },
    {
      path: '/modelos',
      name: 'templates',
      component: () => import('@/views/TemplatesView.vue'),
      meta: { title: 'Meus modelos' },
    },
    {
      path: '/modelos/:id/editar',
      name: 'template-editor',
      component: () => import('@/views/TemplateEditorView.vue'),
      props: true,
      meta: { title: 'Editar modelo', fullWidth: true },
    },
    {
      path: '/modelos/:id/lote',
      name: 'new-lot',
      component: () => import('@/views/NewLotView.vue'),
      props: true,
      meta: { title: 'Novo lote' },
    },
    {
      path: '/lotes',
      name: 'lots',
      component: () => import('@/views/LotsView.vue'),
      meta: { title: 'Lotes gerados' },
    },
    {
      path: '/graduacoes',
      name: 'graduation-systems',
      component: () => import('@/views/GraduationSystemsView.vue'),
      meta: { title: 'Graduações' },
    },
    {
      path: '/graduacoes/:id',
      name: 'graduation-system-editor',
      component: () => import('@/views/GraduationSystemEditView.vue'),
      props: true,
      meta: { title: 'Editar sistema de graduação' },
    },
    {
      path: '/fontes',
      name: 'fonts',
      component: () => import('@/views/FontsView.vue'),
      meta: { title: 'Fontes' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/modelos' },
  ],
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = title ? `${title} | CertAssign` : 'CertAssign'
})
