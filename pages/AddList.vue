<template>
  <div>
    <div v-for="(food, idx) in foods" :key="idx">
      <div class="title-bar">
        <div class="title-text">{{ food.title }}</div>
      </div>
      <div class="form-row">
        <div class="form-option">名稱：</div>
        <input class="edit-input" v-model="food.nameZh" type="text"/>
      </div>
      <div class="form-row">
        <div class="form-option">品項：</div>
        <select class="edit-input" v-model="food.type">
          <option v-for="(option, idx) in options" :key="idx" :value="option.value">
            {{ option.text }}
          </option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-option">購買日期：</div>
        <input class="edit-input" v-model="food.acquisitionDate" type="date"/>
      </div>
      <div class="form-row">
        <div class="form-option">保存期限：</div>
        <input class="edit-input" v-model="food.expirationDate" type="date"/>
      </div>
      <br/>
    </div>
    <div class="btn-row">
      <img class="btn" src="img/liff/btn-cancel.png" @click="delFood"/>
      <img class="btn" src="img/liff/btn-add.png" @click="addFood"/>
      <img class="btn" src="img/liff/btn-fin.png" @click="addFoodToDB"/>
    </div>
  </div>
</template>

<style>
.title-bar {
  height: 40px;
  width: 100%;
  margin-bottom: 5px;
  border-top: 1px #27ab38 solid;
  border-bottom: 1px #d1d1d1 solid;
  background-color: #27ab38;
}

.title-text {
  font-size: 16px;
  margin-left: 12px;
  margin-top: 6px;
  color: #ffffff;
}

.form-row {
  width: 100%;
  padding-left: 12px;
  padding-right: 12px;
  display: flex;
  margin: 0px;
}

.form-option {
  font-size: 14px;
  margin-top: 6px;
  color: #b2b2b2;
}

.edit-input {
  border: 1px #dbdbdb solid;
  background-color: #ffffff;
  color: #878787;
  border-radius: 5px;
  height: 40px;
  width: 90%;
  margin-top: 6px;
  padding-left: 6px;
  outline: none;
  flex-grow: 1;
}

.btn-row {
  width: 100%;
  padding-left: 12px;
  padding-right: 12px;
  display: flex;
  margin: 0px;
  margin-top: -10px;
  margin-bottom: 15px;
  flex-direction: row;
  justify-content: flex-end;
}

.btn {
  height: 37px;
  width: 57px;
  padding: 0px;
  margin-left: 6px;
}
</style>

<script>
import axios from "~/plugins/axios";
import jump from "jump.js";

export default {
  head() {
    return {
      title: "新增清單"
    };
  },
  data() {
    const nowDate = new Date(Date.now())
      .toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false
      })
      .split(" ")[0]
      .replace(/\//g, "-")
      .split("-");
    return {
      nowDate:
        nowDate[0] +
        "-" +
        (nowDate[1].length === 1 ? "0" + nowDate[1] : nowDate[1]) +
        "-" +
        (nowDate[2].length === 1 ? "0" + nowDate[2] : nowDate[2]),
      options: [
        { value: "點心", text: "點心" },
        { value: "飲料", text: "飲料" },
        { value: "肉", text: "肉" },
        { value: "青菜", text: "青菜" },
        { value: "水果", text: "水果" },
        { value: "海鮮", text: "海鮮" },
        { value: "冷凍", text: "冷凍" },
        { value: "其他", text: "其他" }
        
      ],
      foods: []
    };
  },
  created() {
    this.addFood();
  },
  methods: {
    delFood() {
      this.foods.pop();
      if (this.foods.length === 0) this.addFood();
    },
    addFood() {
      this.foods.push({
        title: "品項 " + (this.foods.length + 1),
        nameZh: "",
        type: "其他",
        acquisitionDate: this.nowDate,
        expirationDate: ""
      });
      if (this.foods.length > 1) jump(".btn");
    },
    async addFoodToDB() {
      for (let i = 0; i < this.foods.length; i++)
        if (
          !this.foods[i].nameZh ||
          !this.foods[i].type ||
          !this.foods[i].acquisitionDate ||
          !this.foods[i].expirationDate
        ) {
          alert("請檢查每個欄位都有填！");
          return;
        }
      this.foods.forEach(food => {
        axios.post("/cabinet/userId/add_item", {
          nameZh: food.nameZh,
          type: food.type,
          acquisitionDate: food.acquisitionDate,
          expirationDate: food.expirationDate
        });
      });
      this.$router.push("/RefrigeratorList");
    }
  }
};
</script>
