<template>
  <div>
    <p class="decode-result"
       v-text="text"/>
    <img id="qr-img"
         :src="'/getQr/'+key"/>
  </div>
</template>


<script>
import axios from "axios";
import {connect, getText} from '@/util/ws'

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: "Host",

  data() {
    return {
      key: '',
      text: '',
    }
  },

  mounted() {
    axios.get('/getKey').then(response => {
      this.key = response.data
      connect(this.key)
    })

    setInterval(() => {
      this.text = getText()
    }, 500)
  },

  computed: {},

  methods: {}

}
</script>


<style>
#qr-img {
  /*height: 75vh;*/
}
.decode-result{
  font-size: 24px;
}
</style>
