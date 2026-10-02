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
