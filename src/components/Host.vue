<template>
  <div v-if="key !== String">
    <p class="decode-result"
       v-text="text"/>
    <img id="qr-img"
         :src="'/getQr/'+key"/>
  </div>
</template>


<script>
import axios from "axios";
import {connect, getText, disconnect} from '@/util/ws'

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: "Host",

  data() {
    return {
      key: String,
      text: String,
    }
  },

  mounted() {
    let timer = new Date() - 30000
    setInterval(() => {
      let dif = Math.round((new Date() - timer))
      if (dif >= 30000) {
        this.updateKey()
        timer = new Date()
      }
      this.text = getText()
    }, 500)
  },

  computed: {},

  methods: {
    updateKey() {
      axios.get('/getKey').then(response => {
        this.key = response.data
        disconnect()
        connect(this.key)
      })
    }
  }

}
</script>


<style scoped>
#qr-img {
  /*height: 75vh;*/
}

.decode-result {
  margin: 5px;
  font-size: 24px;
}
</style>
