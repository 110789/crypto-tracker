import { createRouter, createWebHashHistory } from 'vue-router'
import Market   from '@/views/Market.vue'
import Search   from '@/views/Search.vue'
import Overview from '@/views/Overview.vue'
import Tools    from '@/views/Tools.vue'
import Alert    from '@/views/Alert.vue'
import Lottery  from '@/views/Lottery.vue'

const routes = [
  { path: '/',         redirect: '/market' },
  { path: '/market',   component: Market   },
  { path: '/search',   component: Search   },
  { path: '/overview', component: Overview },
  { path: '/tools',    component: Tools    },
  { path: '/alert',    component: Alert    },
  { path: '/lottery',  component: Lottery  },
]
export default createRouter({ history: createWebHashHistory(), routes })
