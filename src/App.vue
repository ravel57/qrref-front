<template>
  <div class="main">
    <div>
      <button
          class="buttons"
          @click="isMobileMode=false"
          v-text="'host'"
      />
      <button
          class="buttons"
          @click="isMobileMode=true"
          v-text="'scanner'"
      />
    </div>
    <Scanner v-if="isMobileMode"/>
    <Host v-else/>

  </div>
</template>


<script>

import Scanner from "@/components/Scanner";
import Host from "@/components/Host";

export default {


  components: {
    Scanner,
    Host
  },

  data() {
    return {
      isMobileMode: true
    }
  },

  mounted() {
    this.isMobileMode = this.isMobile
  },

  methods: {},

  computed: {
    isMobile() {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true
      } else {
        return false
      }
    }
  }

}
</script>

<style>
.main {
  text-align: center;
}

.buttons {
  margin: 0 50px 15px;
  cursor: pointer;
  font-size: 25px;
  padding: 10px 50px;
}
</style>
