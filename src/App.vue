<template>
  <div class="main">
    <div>
      <button
          class="buttons"
          @click="isScannerMode=false"
          v-text="'host'"
          :class="{ selected : !isScannerMode }"
      />
      <button
          class="buttons"
          @click="isScannerMode=true"
          v-text="'scanner'"
          :class="{ selected : isScannerMode }"
      />
    </div>
    <Scanner v-if="isScannerMode"/>
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
      isScannerMode: true
    }
  },

  mounted() {
    this.isScannerMode = this.isMobile
  },

  methods: {},

  computed: {
    isMobile() {
      return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
  }

}
</script>



<style scoped>
.main {
  text-align: center;
}

.buttons {
  margin: 0 50px 15px;
  cursor: pointer;
  font-size: 25px;
  padding: 10px 50px;
  border: solid 1px;
  border-radius: 10px;
}

.buttons.selected {
  border-color: #1e90ff;
  font-weight: 700;
  border: solid 2px;
}
</style>
