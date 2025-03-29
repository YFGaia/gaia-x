package initialize

import (
	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x"
)

func bizModel() error {
	db := global.GVA_DB
	err := db.AutoMigrate(
		gaia_x.Version{},
	)
	if err != nil {
		return err
	}
	return nil
}
