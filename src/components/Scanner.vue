<template>
  <div class="scanner">
    <p class="error"
       v-text="error"/>
    <p class="input"
       v-text="'Текст для перессылки:'"/>
    <input class="input"
           @input='evt => text = evt.target.value'/>
    <!--<p class="decode-result">Last result: <b>{{ scanResult }}</b></p>-->

    <qrcode-stream
        @decode="onDecode"
        @init="onInit"
    />
  </div>
</template>


<script>
import {QrcodeStream} from '../../node_modules/vue-qrcode-reader/src'
import axios from "axios";

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Scanner',

  components: {
    QrcodeStream
  },

  data() {
    return {
      scanResult: '',
      error: '',
      text: '',
    }
  },

  computed: {},

  methods: {
    onDecode(scanResult) {
      if (!scanResult.toString().startsWith('https://'))
        scanResult = 'https://' + scanResult
      this.scanResult = scanResult
      let url = new URL(scanResult)
      let key = url.searchParams.get('key')
      let text = this.text
      axios.post('/' + key, null, {params: {text}})
          .then(/*response => console.log(response.data)*/)
    },

    async onInit(promise) {
      try {
        await promise
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          this.error = "ERROR: you need to grant camera access permission"
        } else if (error.name === 'NotFoundError') {
          this.error = "ERROR: no camera on this device"
        } else if (error.name === 'NotSupportedError') {
          this.error = "ERROR: secure context required (HTTPS, localhost)"
        } else if (error.name === 'NotReadableError') {
          this.error = "ERROR: is the camera already in use?"
        } else if (error.name === 'OverconstrainedError') {
          this.error = "ERROR: installed cameras are not suitable"
        } else if (error.name === 'StreamApiNotSupportedError') {
          this.error = "ERROR: Stream API is not supported in this browser"
        } else if (error.name === 'InsecureContextError') {
          this.error = 'ERROR: Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.';
        } else {
          this.error = `ERROR: Camera error (${error.name})`;
        }
      }

    },
  },

}

</script>


<style scoped>
.input {
  width: 50vw;
  margin: 5px;
  font-size: 24px;
}

.error {
  font-weight: bold;
  color: red;
}

.scanner {
  width: 50%;
  height: 50%;
  margin-left: 25%;
}
</style>
