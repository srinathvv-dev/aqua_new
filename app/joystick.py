import rospy
from std_msgs.msg import Float64MultiArray
import pygame

# Constants
PWM_CENTER = 1500
PWM_RANGE = 130  # Maximum deviation from center
LIGHT_PWM_MIN = 1100
LIGHT_PWM_MAX = 1500
LIGHT_PWM_STEP = 100

# ROS Publishers
pub_horizontal = rospy.Publisher('th_h', Float64MultiArray, queue_size=10)
pub_vertical = rospy.Publisher('th_v', Float64MultiArray, queue_size=10)
pub_light = rospy.Publisher('light', Float64MultiArray, queue_size=10)

# Initialize ROS node
rospy.init_node('thruster_joystick', anonymous=True)

# Initialize Pygame
pygame.init()
pygame.joystick.init()

if pygame.joystick.get_count() == 0:
    rospy.logerr("No joystick found. Exiting...")
    pygame.quit()
    exit()

joystick = pygame.joystick.Joystick(0)
joystick.init()

def joy_to_pwm(value):
    """Maps joystick value [-1,1] to PWM range [1200,1800]."""
    return int(PWM_CENTER + value * PWM_RANGE)

def talker():
    rate = rospy.Rate(10)  # 10Hz

    light_pwm = LIGHT_PWM_MIN  # Default light value
    light_on = False

    while not rospy.is_shutdown():
        pygame.event.pump()

        # Read Joystick Inputs
        joy_forward = joystick.get_axis(1)  # Forward/Backward
        joy_lateral = joystick.get_axis(0)  # Left/Right
        joy_depth = -joystick.get_axis(2)     # Depth
        joy_rotation = joystick.get_axis(3) # Clockwise/Counterclockwise Rotation

        # **Thruster Mapping**
        t_1 = joy_to_pwm(-joy_lateral + joy_rotation)
        t_2 = joy_to_pwm(joy_lateral + joy_rotation)
        t_3 = joy_to_pwm(joy_forward)

        t_4 = joy_to_pwm(joy_depth)
        t_5 = joy_to_pwm(joy_depth)

        # Process Button Events
        for event in pygame.event.get():
            if event.type == pygame.JOYBUTTONDOWN:
                if event.button == 4 and light_on:
                    light_pwm = max(LIGHT_PWM_MIN, light_pwm - LIGHT_PWM_STEP)
                elif event.button == 5 and light_on:
                    light_pwm = min(LIGHT_PWM_MAX, light_pwm + LIGHT_PWM_STEP)
                elif event.button == 6:
                    light_pwm = LIGHT_PWM_MIN if light_on else LIGHT_PWM_MAX
                    light_on = not light_on

        # Publish Thruster Values
        msg_horizontal = Float64MultiArray()
        msg_horizontal.data = [t_4, t_1, t_2]
        
        msg_vertical = Float64MultiArray()
        msg_vertical.data = [t_5, t_3]
        
        msg_light = Float64MultiArray()
        msg_light.data = [light_pwm]

        pub_horizontal.publish(msg_horizontal)
        pub_vertical.publish(msg_vertical)
        pub_light.publish(msg_light)

        rospy.loginfo("Published Horizontal: {}, Vertical: {}, Light: {}".format(
            msg_horizontal.data, msg_vertical.data, msg_light.data))

        rate.sleep()

if __name__ == '__main__':
    try:
        talker()
    except rospy.ROSInterruptException:
        pygame.quit()