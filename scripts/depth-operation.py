#!/usr/bin/env python
import rospy
from std_msgs.msg import String
import sys

# Constants
DEPTH_THRESHOLD_ABS = 0.05
SENSITIVITY_DEPTH_DIFFERENCE = 1.0
KPID = -2
KP = 0.5
KI = 0.08
KD = 0.5
SAMPLING_TIME = 0.1

# Global variables
depth = 0.0
P_Error_Old = 0.0
P_IError = [0.0] * 100
Sum_P_IError = 0.0
com_str = None  # Global variable for the publisher

def callback(data):
    global depth
    depth_measured = data.data
    depth = float(depth_measured[7:12])
    if depth < 0:
        depth = 0
    rospy.loginfo("Depth: %f", depth)

def bar30_temp_sub():
    rospy.Subscriber("/bar30/all", String, callback)

def depth_control(depth_setpoint, depth):
    global P_Error_Old, P_IError, Sum_P_IError, KPID, com_str
    
    P_Error = (depth_setpoint - depth)
    P_DError = (P_Error - P_Error_Old) / SAMPLING_TIME
    P_IError = [P_Error * SAMPLING_TIME] + P_IError[:-1]
    Sum_P_IError = sum(P_IError)
    Sum_P_IError = max(min(Sum_P_IError, 10), -10)

    p = KP * P_Error
    i = KI * Sum_P_IError
    d = KD * P_DError
    pid_val = p + i + d

    normalized_pid_val = ((pid_val - (-SENSITIVITY_DEPTH_DIFFERENCE)) /
                          (SENSITIVITY_DEPTH_DIFFERENCE - (-SENSITIVITY_DEPTH_DIFFERENCE))) * 2 - 1

    # Publish the normalized PID value
    normalized_pid_msg = String()
    normalized_pid_msg.data = str(normalized_pid_val)
    com_str.publish(normalized_pid_msg)  # Publishing to the ROS topic

    if abs(depth_setpoint - depth) <= DEPTH_THRESHOLD_ABS:
        rospy.loginfo("Reached target depth. Thrusters neutralized.")
    else:
        rospy.loginfo("Depth control active.")
    rospy.loginfo("Normalized PID Value: %f", normalized_pid_val)

def main():
    global com_str

    if len(sys.argv) != 2:
        print("Usage: depth-operation.py <depth_setpoint>")
        sys.exit(1)

    depth_setpoint = float(sys.argv[1])

    rospy.init_node("joy_node", anonymous=True)
    com_str = rospy.Publisher("joy_topic", String, queue_size=1)
    bar30_temp_sub()
    rate = rospy.Rate(5)

    while not rospy.is_shutdown():
        depth_control(depth_setpoint, depth)
        rate.sleep()

if __name__ == '__main__':
    try:
        main()
    except rospy.ROSInterruptException:
        pass
