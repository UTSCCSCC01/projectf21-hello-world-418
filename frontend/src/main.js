import Vue from 'vue'
import App from './App.vue'

import router from './router'
import vuetify from '@/plugins/vuetify'
import axios from 'axios';

import Notifications from 'vue-notification'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

const client = axios.create({
  baseUrl: process.env.VUE_APP_BACKEND_URL
});
client.defaults.baseURL = process.env.VUE_APP_BACKEND_URL;
client.interceptors.request.use(request => {
  request.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  return request;
});

Vue.config.productionTip = false
Vue.prototype.$http = client;
Vue.prototype.$currentUser = {};
Vue.use(Notifications)

new Vue({
  router,
  vuetify,
  render: h => h(App)
}).$mount('#app')

router.beforeEach((to, _, next) => {
  console.log({ to, next, localStorage });
  if (to.meta.noAuthRequired) {
    next();
  } else if (localStorage.getItem('token')) {
    Vue.prototype.$http.get('/auth/user')
      .then(res => {
        Vue.prototype.$currentUser = res.data;
        next()
      })
      .catch(err => {
        this.$notify({
          type: "error",
          title: "Failed to authenticate",
        });
        this.$router.push({ name: 'SignIn' });
        console.error(err);
      });
  } else {
    next({ name: 'SignIn' });
  }
});
