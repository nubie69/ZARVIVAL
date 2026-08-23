package utilz;

import entities.PlayerCharacter;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.net.URL;

import javax.imageio.ImageIO;

public class LoadSave {

    public static final String PLAYER1 = "player1.png";
    public static final String PLAYER2 = "aliah.png";
    public static final String PLAYER3 = "player2.png";
    public static final String LEVEL_ATLAS = "outside_sprites.png";
    public static final String MENU_BUTTONS = "button_atlas.png";
    public static final String MENU_BACKGROUND = "MENU.png";
    public static final String SOUND_BUTTONS = "sound_buttons.png";
    public static final String PAUSE_BACKGROUND = "GAME_PAUSED.png";
    public static final String URM_BUTTONS = "urm_buttons.png";
    public static final String VOLUME_BUTTONS = "volume_buttons.png";
    public static final String MENU_BACKGROUND_IMG = "bg3.jpg";
    public static final String PLAYING_BG_IMG = "BGnew.png";
    public static final String BACK_PINE = "Pine2.png";
    public static final String BACK_PINE2 = "Pine1.png";

    public static final String SMALL_CLOUDS = "mini_cloud.png";
    public static final String MUSHROOM_SPRITE = "mushroom_sprite.png";
    public static final String STATUS_BAR = "health_power_bar.png";
    public static final String COMPLETED_IMG = "LEVEL_COMPLETED.png";
    public static final String POTION_ATLAS = "potions_sprites.png";
    public static final String CONTAINER_ATLAS = "objects_sprites.png";
    public static final String TRAP_ATLAS = "trap_atlas.png";
    public static final String CANNON_ATLAS = "Shooters.png";
    public static final String CANNON_BALL = "Ball.png";
    public static final String DEATH_SCREEN = "YOU_DEAD.png";
    public static final String OPTIONS_MENU = "OPTIONS.png";
    public static final String PINKSTAR_ATLAS = "Armadillo.png";
    public static final String QUESTION_ATLAS = "question_atlas.png";
    public static final String EXCLAMATION_ATLAS = "exclamation_atlas.png";
    public static final String SHARK_ATLAS = "Froggy.png";
    public static final String CREDITS = "newTUTORIAL.png";
    public static final String GRASS_ATLAS = "grass_atlas.png";
    public static final String TREE_ONE_ATLAS = "Pine_tree.png";
    public static final String TREE_TWO_ATLAS = "Large_Tree.png";
    public static final String GAME_COMPLETED = "game_completed.png";
    public static final String RAIN_PARTICLE = "rain_particle.png";
    public static final String WATER_TOP = "water_atlas_animation.png";
    public static final String WATER_BOTTOM = "water.png";


    public static BufferedImage[][] loadAnimations(PlayerCharacter pc) {
        BufferedImage img = LoadSave.GetSpriteAtlas(pc.playerAtlas);
        BufferedImage[][] animations = new BufferedImage[pc.rowA][pc.colA];
        for (int j = 0; j < animations.length; j++)
            for (int i = 0; i < animations[j].length; i++)
                animations[j][i] = img.getSubimage(i * pc.spriteW, j * pc.spriteH, pc.spriteW, pc.spriteH);

        return animations;
    }



    public static BufferedImage GetSpriteAtlas(String fileName) {
        BufferedImage img = null;
        InputStream is = LoadSave.class.getResourceAsStream("/" + fileName);
        if (is == null) {
            System.out.println("Resource not found: " + fileName);
            throw new IllegalArgumentException("Resource not found:" + fileName);
        }
        try {
            img = ImageIO.read(is);
        } catch (IOException e) {
            e.printStackTrace();
            throw new IllegalArgumentException("Error reading resource: " + fileName, e);
        }

        return img;
    }

    
    public static BufferedImage[] GetAllLevels() {
        URL url = LoadSave.class.getResource("/lvls");
        File file = null;

        try {
            file = new File(url.toURI());
        } catch (URISyntaxException e) {
            e.printStackTrace();
        }

        File[] files = file.listFiles();
        File[] filesSorted = new File[files.length];

        for (int i = 0; i < filesSorted.length; i++)
            for (int j = 0; j < files.length; j++) {
                if (files[j].getName().equals((i + 1) + ".png"))
                    filesSorted[i] = files[j];

            }

        BufferedImage[] imgs = new BufferedImage[filesSorted.length];

        for (int i = 0; i < imgs.length; i++)
            try {
                imgs[i] = ImageIO.read(filesSorted[i]);
            } catch (IOException e) {
                e.printStackTrace();
            }

        return imgs;
    }

}