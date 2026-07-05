VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} UserForm3 
   Caption         =   "選擇挑戰難度"
   ClientHeight    =   7620
   ClientLeft      =   120
   ClientTop       =   470
   ClientWidth     =   14400
   OleObjectBlob   =   "UserForm3.frx":0000
   StartUpPosition =   1  '所屬視窗中央
End
Attribute VB_Name = "UserForm3"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Declare PtrSafe Function sndPlaySound Lib "winmm.dll" Alias "sndPlaySoundA" (ByVal lpszSoundName As String, ByVal uFlags As Long) As Long

Private Sub Over_01_Click()
AI等級 = 1
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back1.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back1.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back1.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_02_Click()
AI等級 = 2
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back2.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back2.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back2.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_03_Click()
AI等級 = 3
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back3.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back3.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back3.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_04_Click()
AI等級 = 4
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back4.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back4.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back4.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_05_Click()
AI等級 = 5
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back5.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back5.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back5.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_06_Click()
AI等級 = 6
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back6.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back6.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back6.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_07_Click()
AI等級 = 7
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back7.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back7.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back7.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_08_Click()
AI等級 = 8
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back8.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back8.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back8.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_09_Click()
AI等級 = 9
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back9.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back9.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back9.BackColor = 選人顏色
Show_UserForm1_All
End Sub
Private Sub Over_10_Click()
AI等級 = 10
sndPlaySound RecourcePATH & "SND_Start.wav", 1
For i = 1 To 5
    UserForm3.Label_Back10.BackColor = 選人顏色
    Delay_Time 0.1
    UserForm3.Label_Back10.BackColor = 0
    Delay_Time 0.1
Next i
UserForm3.Label_Back10.BackColor = 選人顏色
Show_UserForm1_All
End Sub

Private Sub UserForm_Activate()

Worksheets("Play").WindowsMediaPlayer1.settings.playCount = 10000
Worksheets("Play").WindowsMediaPlayer1.url = RecourcePATH & "MSC_Choice_Level.wma"

End Sub

Private Sub UserForm_Terminate()

Worksheets("Play").WindowsMediaPlayer1.url = ""
End

End Sub

Sub Delay_Time(DelaySecond)

Old_Time = Timer

n = False
Do
If n = False Then
    DoEvents
    n = True
End If
Loop Until Timer - Old_Time >= DelaySecond

End Sub
