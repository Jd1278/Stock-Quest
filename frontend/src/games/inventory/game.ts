import Phaser from "phaser";
import type { Run } from "../../types";
export interface InventoryBridge {
  onOrder: () => void;
}
export function createInventoryGame(
  parent: HTMLElement,
  bridge: InventoryBridge,
  initial: Run,
) {
  class WarehouseScene extends Phaser.Scene {
    private stockText!: Phaser.GameObjects.Text;
    private dayText!: Phaser.GameObjects.Text;
    private stockBlocks: Phaser.GameObjects.Rectangle[] = [];
    create() {
      this.cameras.main.setBackgroundColor("#0b203d");
      this.add.text(30, 24, "BODEGA / OPERACIÓN DIARIA", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#c0cae0",
      });
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
          const x = 65 + col * 66,
            y = 125 + row * 68;
          this.add
            .rectangle(x, y, 54, 48, 0x24385f)
            .setStrokeStyle(1, 0x49608b);
          const block = this.add.rectangle(x, y, 40, 32, 0xce740c);
          this.stockBlocks.push(block);
        }
        this.add.rectangle(296, 154 + row * 68, 544, 6, 0x8292b1);
      }
      this.stockText = this.add.text(32, 335, "", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
      });
      this.dayText = this.add.text(32, 375, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#b8c5e0",
      });
      const order = this.add
        .rectangle(676, 174, 158, 84, 0xeb8b13)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(676, 174, "PREPARAR\nPEDIDO", {
          align: "center",
          fontFamily: "monospace",
          fontSize: "17px",
          color: "#0b203d",
        })
        .setOrigin(0.5);
      order.on("pointerdown", () => bridge.onOrder());
      this.add.text(607, 246, "PROVEEDOR", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#c0cae0",
      });
      this.game.events.on("inventory:state", this.updateStock, this);
      this.events.once("shutdown", () =>
        this.game.events.off("inventory:state", this.updateStock, this),
      );
      this.updateStock(initial);
    }
    updateStock(run: Run) {
      this.stockText.setText(`DISPONIBLE  ${run.stock} uds.`);
      this.dayText.setText(
        run.finished
          ? "JORNADA FINALIZADA"
          : `DÍA ${run.day + 1} DE ${run.days} · PLAZO ${run.leadTime} DÍAS`,
      );
      const visible = Math.min(24, Math.ceil(run.stock / 5));
      this.stockBlocks.forEach((block, i) => {
        block.setAlpha(i < visible ? 1 : 0);
      });
      if (run.day > 0) {
        const marker = this.add.circle(720, 310, 9, 0xeb8b13);
        this.tweens.add({
          targets: marker,
          x: 350,
          duration: 850,
          onComplete: () => marker.destroy(),
        });
      }
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 430,
    backgroundColor: "#0b203d",
    scene: WarehouseScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true },
    audio: { noAudio: true },
  });
  return {
    update: (run: Run) => game.events.emit("inventory:state", run),
    destroy: () => game.destroy(true),
  };
}
