/// <reference path="../node_modules/phaser/typescript/phaser.d.ts"/>

class HoffVsZombies extends Phaser.Game {
  
  constructor() {
    super(800, 380, Phaser.AUTO, '');
    this.state.add('Preload', Preload, false);
    this.state.add('GameIntro', GameIntro, false);
    this.state.add('PlayGame', PlayGame, false);
    this.state.add('GameOver', GameOver, false);
    this.state.start('Preload'); 
  }  
}

class Preload extends Phaser.State { 
  preload() {
      this.load.image('background', 'images/bg.png');
      this.load.image('zombie', 'images/zombies.png');
      this.load.image('hoff', 'images/hoff01.png');
      this.load.image('hoff-dead', 'images/hoff-dead.png');
      this.load.audio('music', 'https://dl.dropboxusercontent.com/u/4898984/Mitch%20Murder%20-%20Knight%20Rider%20Theme.ogg');
  }
  
  create() {
    this.physics.startSystem(Phaser.Physics.ARCADE);
    this.stage.backgroundColor = '#ffffcc';   
    var music = this.game.add.audio('music');
    music.play();
    this.game.state.start('GameIntro'); 
  }  
}

class GameIntro extends Phaser.State { 
  
  create() {    
    var background = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'background');
    background.anchor.setTo(0.5, 0.5);
    background.scale.setTo(0.1, 0.1);
    
    var playGame = () => {
       this.game.state.start('PlayGame', false, false);
    }

    var zoomStart = this.game.add.tween(background.scale).to({ x: 0.2, y: 0.2 }, 2000, Phaser.Easing.Bounce.Out, true);
    zoomStart.onComplete.add(playGame);   
  }
}

class Hoff extends Phaser.Sprite {
  cursors: Phaser.CursorKeys;  
  facingLeft = false;
  isDead = false;
  
  constructor(game: Phaser.Game, x: number, y: number) {
      super(game, x, y, 'hoff');
      this.scale.setTo(0.2);
      this.game.physics.arcade.enable(this);
      this.body.collideWorldBounds = true;
      this.cursors = this.game.input.keyboard.createCursorKeys();
      this.anchor.setTo(.5, 1);
      game.add.existing(this);
  }

  update() {
    this.body.velocity.x = 0;
    this.body.velocity.y = 0;
    
    if (this.isDead)
      return;      
    
    if (this.cursors.left.isDown)
    {
        this.body.velocity.x = -150;
    }
    else if (this.cursors.right.isDown)
    {
        this.body.velocity.x = 150;
    }
    else if (this.cursors.up.isDown)
    {
        this.body.velocity.y = -150;
    }
    else if (this.cursors.down.isDown)
    {
        this.body.velocity.y = 150;
    }

    if (this.cursors.up.isDown && this.body.touching.down)
    {
        this.body.velocity.y = -350;
    }
    
    var newFacingLeft = this.body.velocity.x < 0 || (this.facingLeft &&  this.body.velocity.x == 0 );
    if (newFacingLeft != this.facingLeft)
      this.scale.x = -this.scale.x;
    this.facingLeft = newFacingLeft;
  }
  
  youAreDead() {
    this.loadTexture('hoff-dead');
    this.isDead = true;
  }
}

class Zombie extends Phaser.Sprite {
  hoff: Phaser.Sprite;
  SPEED = 50;
  TURN_RATE = 0.2;
  moveAngle = 0;
  facingLeft = true;
  
  constructor(game: Phaser.Game, x: number, y: number, hoff : Phaser.Sprite) {
      super(game, x, y, 'zombie');
      this.hoff = hoff;
      this.scale.setTo(0.2);
      this.game.physics.arcade.enable(this);
      this.body.collideWorldBounds = true;
      this.anchor.setTo(.5, 1);
      game.add.existing(this);
  }

  update() {
    var targetAngle = Phaser.Math.angleBetween(
      this.x, this.y,
      this.hoff.x, this.hoff.y
    );
    
    //blatantly just a modified version of http://gamemechanicexplorer.com/#homingmissiles-5 (NB that version mixes degrees and radians)
    if (this.moveAngle != targetAngle) {
      var delta = targetAngle - this.moveAngle;

      // Keep it in range from -180 to 180 to make the most efficient turns.
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;

      if (delta > 0) {
          this.moveAngle += this.TURN_RATE;
      } else {
          this.moveAngle -= this.TURN_RATE;
      } 
      
      this.body.velocity.x = Math.cos(this.moveAngle) * this.SPEED;
      this.body.velocity.y = Math.sin(this.moveAngle) * this.SPEED;
      
      //should extract this to shared function
      var newFacingLeft = this.body.velocity.x < 0 || (this.facingLeft &&  this.body.velocity.x == 0 );
      if (newFacingLeft != this.facingLeft)
        this.scale.x = -this.scale.x;
      this.facingLeft = newFacingLeft;
    }
  }
}

class PlayGame extends Phaser.State { 
    hoff: Hoff;    
    zombies: Phaser.Group;
    nextZombieTime = 3000;
    zombieDelay = 5000;
    
  create() {      
    this.game.physics.arcade.bounds.y = 100;
    this.game.physics.arcade.bounds.height = this.game.world.height - 100;    
    this.zombies = this.game.add.group(); 
    this.zombies.enableBody = true;
    this.hoff = new Hoff(this.game, 400, this.game.world.height - 200);
  }
    
  update() {  
    var spawnZombies = () => {
      if (this.nextZombieTime < this.time.now) {
        this.nextZombieTime = this.time.now + this.zombieDelay;
        //TODO tidy this up
        //don't spawn on top of the Hoff
        var x = Math.floor(Math.random() * this.game.physics.arcade.bounds.width);
        while (Math.abs(x - this.hoff.x) < 100)
          x = Math.floor(Math.random() * this.game.physics.arcade.bounds.width)
        var y = Math.floor(Math.random() * this.game.physics.arcade.bounds.height);
        var zombie = this.zombies.add(new Zombie(this.game, x, y, this.hoff));
      }
    }
  
    spawnZombies();
    
    var onOverlap = () => {
      this.hoff.youAreDead();
      this.game.state.start('GameOver', false, false);
    }
    var overlapModifier = (hoff, zombie) => {
      var yDiff = Math.abs(hoff.y - zombie.y);
      return yDiff < 20;
    }    
    this.game.physics.arcade.overlap(this.hoff, this.zombies, onOverlap, overlapModifier, this);
  }
}

class GameOver extends Phaser.State { 
  text: Phaser.Text;
  textTurnStart: number;
  TEXT_TURN_RATE = 0.2;
  TEXT_TURN_DURATION = 1600;
  
  create() {
    
    var style = {
      font: 'Arial Black',
      fontSize: 70,
      fontWeight: 'bold',
      fill: '#cc0000'
    };
    this.text = this.game.add.text(this.game.world.centerX, 250, 'GAME OVER!', style);
    this.text.anchor.set(0.5);
    this.text.align = 'center';
    this.text.scale.setTo(0.01, 0.01)
    this.text.setShadow(5, 5, 'rgba(0, 0, 0, 0.5)', 2);
    this.textTurnStart = this.time.now;
    //TODO more crazy zoom bounce
    this.game.add.tween(this.text.scale).to({ x: 1.3, y: 1.3 }, 2000, Phaser.Easing.Bounce.Out, true);
     
    this.input.keyboard.onDownCallback = () => {
      //TODO this line shouldn't be copy-pasta
      if (this.time.now > (this.textTurnStart + this.TEXT_TURN_DURATION)) {
        this.input.keyboard.onDownCallback = null;
        this.game.state.start('GameIntro', true, false);
      }
    };
  }
  
  update() {
    //TODO this line shouldn't be copy-pasta
    if (this.time.now < (this.textTurnStart + this.TEXT_TURN_DURATION))
      this.text.rotation += this.TEXT_TURN_RATE;
  }
}

window.onload = () => {
  var game = new HoffVsZombies();
};
