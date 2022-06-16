<template>
  <div>
    <img :src="'/getQr/'+key"/>
  </div>
</template>

<script>
import axios from "axios";

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: "Host",

  data() {
    return {
      key: '',
    }
  },

  mounted() {
    axios.get('/getKey').then(response => this.key = response.data)
    // this.$store.commit('saveKey', this.key)
    // console.log(this.$store.getters.key)
  }

}
</script>

<style>

</style>
