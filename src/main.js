import Vue from 'vue'
import App from './App.vue'
import router from './router'
import '@/assets/reset.css'
import '@babel/polyfill'
import './plugins/axios'
import './plugins/bootstrap-vue'

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
