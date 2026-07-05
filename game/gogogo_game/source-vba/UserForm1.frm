VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} UserForm1 
   Caption         =   "模擬AI對戰"
   ClientHeight    =   8710.001
   ClientLeft      =   110
   ClientTop       =   470
   ClientWidth     =   7660
   OleObjectBlob   =   "UserForm1.frx":0000
   StartUpPosition =   1  '所屬視窗中央
End
Attribute VB_Name = "UserForm1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Declare PtrSafe Function sndPlaySound Lib "winmm.dll" Alias "sndPlaySoundA" (ByVal lpszSoundName As String, ByVal uFlags As Long) As Long

Private Sub Label_Button1_Click()

If CanEnter = True Then
    CanEnter = False
    User_Time = Clock_Time
    If User_Time > AI_Time Then
        AI此題花費秒數 = RandRange((每題作答秒數 - User_Time) + 0.1, AI此題花費秒數)
        AI_Time = 每題作答秒數 - AI此題花費秒數
    End If
    User此題選擇 = 1
    'sndPlaySound RecourcePATH & "SND_User_Select.wav", 1
    'Draw_User_Answer
    'Draw_AI_Thinking
    Answer_Judgment
End If

End Sub

Private Sub Label_Button2_Click()

If CanEnter = True Then
    CanEnter = False
    User_Time = Clock_Time
    If User_Time > AI_Time Then
        AI此題花費秒數 = RandRange((每題作答秒數 - User_Time) + 0.1, AI此題花費秒數)
        AI_Time = 每題作答秒數 - AI此題花費秒數
    End If
    User此題選擇 = 2
    'sndPlaySound RecourcePATH & "SND_User_Select.wav", 1
    'Draw_User_Answer
    'Draw_AI_Thinking
    Answer_Judgment
End If

End Sub

Private Sub Label_Button3_Click()

If CanEnter = True Then
    CanEnter = False
    User_Time = Clock_Time
    If User_Time > AI_Time Then
        AI此題花費秒數 = RandRange((每題作答秒數 - User_Time) + 0.1, AI此題花費秒數)
        AI_Time = 每題作答秒數 - AI此題花費秒數
    End If
    User此題選擇 = 3
    'sndPlaySound RecourcePATH& "SND_User_Select.wav", 1
    'Draw_User_Answer
    'Draw_AI_Thinking
    Answer_Judgment
End If

End Sub

Private Sub Label_Button4_Click()

If CanEnter = True Then
    CanEnter = False
    User_Time = Clock_Time
    If User_Time > AI_Time Then
        AI此題花費秒數 = RandRange((每題作答秒數 - User_Time) + 0.1, AI此題花費秒數)
        AI_Time = 每題作答秒數 - AI此題花費秒數
    End If
    User此題選擇 = 4
    'sndPlaySound RecourcePATH & "SND_User_Select.wav", 1
    'Draw_User_Answer
    'Draw_AI_Thinking
    Answer_Judgment
End If

End Sub

Private Sub Button_END_Click()

Result_Screen

End Sub

Private Sub UserForm_Activate()

Worksheets("Play").WindowsMediaPlayer1.settings.playCount = 10000
Worksheets("Play").WindowsMediaPlayer1.url = ResourcePath & "MSC_Battle-low.wma"

UserForm1.Image_Clock_Time.Picture = LoadPicture(倒數圖片1)
UserForm1.User_Image1.Picture = LoadPicture(答對圖片)
UserForm1.User_Image2.Picture = LoadPicture(答對圖片)
UserForm1.User_Image3.Picture = LoadPicture(答對圖片)
UserForm1.User_Image4.Picture = LoadPicture(答對圖片)
UserForm1.AI_Image1.Picture = LoadPicture(答對圖片)
UserForm1.AI_Image2.Picture = LoadPicture(答對圖片)
UserForm1.AI_Image3.Picture = LoadPicture(答對圖片)
UserForm1.AI_Image4.Picture = LoadPicture(答對圖片)
UserForm1.User_Image5.Picture = LoadPicture(答錯圖片)
UserForm1.User_Image6.Picture = LoadPicture(答錯圖片)
UserForm1.User_Image7.Picture = LoadPicture(答錯圖片)
UserForm1.User_Image8.Picture = LoadPicture(答錯圖片)
UserForm1.AI_Image5.Picture = LoadPicture(答錯圖片)
UserForm1.AI_Image6.Picture = LoadPicture(答錯圖片)
UserForm1.AI_Image7.Picture = LoadPicture(答錯圖片)
UserForm1.AI_Image8.Picture = LoadPicture(答錯圖片)

UserForm1.Image_Bomb.Picture = LoadPicture(炸彈圖片)
UserForm1.Image_Spark.Picture = LoadPicture(火花圖片)

UserForm1.Image_User_Score.Height = 0
UserForm1.Image_AI_Score.Height = 0

UserForm1.Label_User_Score.Caption = User_Score
UserForm1.Label_AI_Score.Caption = AI_Score

Start_Game

End Sub

Private Sub UserForm_Initialize()

'Start_Game

End Sub

Private Sub UserForm_Terminate()

Worksheets("Play").WindowsMediaPlayer1.url = ""
End

End Sub

Private Function RandRange(ByVal Rand_A As Single, ByVal Rand_B As Single) As Single

Randomize Timer
RandRange = (Rnd * ((Rand_B - Rand_A) + 1)) + Rand_A

End Function
